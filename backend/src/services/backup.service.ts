import { PrismaClient, BackupType } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export interface BackupMetadata {
  version: string; // Backup format version
  appVersion: string; // Noter version
  createdAt: Date;
  type: 'data';

  database: {
    name: string;
    size: number;
  };

  uploads: {
    fileCount: number;
    totalSize: number;
  };

  statistics: {
    users: number;
    notes: number;
    folders: number;
    shares: number;
    attachments: number;
    tags: number;
  };
}

export class BackupService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Erstellt ein neues Backup (Database + Uploads)
   */
  async createBackup(type: BackupType = 'MANUAL'): Promise<any> {
    const timestamp = Date.now();
    const tempDir = path.join(os.tmpdir(), `backup_${timestamp}`);
    const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');

    // Erstelle Backup-Record in DB
    const backup = await this.prisma.backup.create({
      data: {
        type,
        provider: 'local',
        size: 0, // Wird später aktualisiert
        status: 'IN_PROGRESS',
      },
    });

    try {
      // 1. Erstelle temp directory
      await fs.mkdir(tempDir, { recursive: true });
      await fs.mkdir(backupDir, { recursive: true });

      // 2. Database Backup
      console.log('Backing up database...');
      await this.backupDatabase(tempDir);

      // 3. Uploads Backup
      console.log('Backing up uploads...');
      await this.backupUploads(tempDir);

      // 4. Metadata
      console.log('Creating metadata...');
      const metadata = await this.createMetadata(tempDir);
      await fs.writeFile(
        path.join(tempDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // 5. Compress
      console.log('Compressing...');
      const backupFilename = `backup_${timestamp}.tar.gz`;
      const backupPath = path.join(backupDir, backupFilename);

      await this.compress(tempDir, backupPath);

      // 6. Cleanup temp
      await fs.rm(tempDir, { recursive: true, force: true });

      // 7. Update backup record
      const fileSize = (await fs.stat(backupPath)).size;

      const updatedBackup = await this.prisma.backup.update({
        where: { id: backup.id },
        data: {
          path: backupFilename, // Nur Dateiname, nicht kompletter Pfad
          size: fileSize,
          status: 'COMPLETED',
          metadata: metadata as any,
        },
      });

      console.log(`✅ Backup created: ${backupPath} (${this.formatBytes(fileSize)})`);
      return updatedBackup;
    } catch (error: any) {
      console.error('❌ Backup failed:', error);

      // Update backup record mit Fehler
      await this.prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'FAILED',
          error: error.message || 'Unknown error',
        },
      });

      // Cleanup
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}

      throw error;
    }
  }

  /**
   * Backup der Datenbank via pg_dump (oder sqlite3)
   */
  private async backupDatabase(targetDir: string): Promise<void> {
    const dbUrl = process.env.DATABASE_URL!;
    const outputPath = path.join(targetDir, 'database.sql');

    // Prüfe ob SQLite oder PostgreSQL
    if (dbUrl.startsWith('file:')) {
      // SQLite: Einfach DB-Datei kopieren
      const dbPath = dbUrl.replace('file:', '');
      const resolvedDbPath = path.resolve(process.cwd(), dbPath);
      await fs.copyFile(resolvedDbPath, outputPath);
    } else if (dbUrl.startsWith('postgresql:')) {
      // PostgreSQL: pg_dump
      const url = new URL(dbUrl);
      const command = `PGPASSWORD="${url.password}" pg_dump \
        -h ${url.hostname} \
        -p ${url.port || 5432} \
        -U ${url.username} \
        -d ${url.pathname.slice(1)} \
        -Fc \
        -f ${outputPath}`;

      await execPromise(command);
    } else {
      throw new Error('Unsupported database type');
    }
  }

  /**
   * Backup des Uploads-Verzeichnisses
   */
  private async backupUploads(targetDir: string): Promise<void> {
    const uploadsSource = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const uploadsTarget = path.join(targetDir, 'uploads');

    try {
      await fs.access(uploadsSource);
      await fs.cp(uploadsSource, uploadsTarget, {
        recursive: true,
        filter: (src) => !src.includes('.tmp') && !path.basename(src).startsWith('.'),
      });
    } catch (error) {
      console.warn('Uploads directory not found or empty, skipping...');
      // Erstelle leeres Verzeichnis
      await fs.mkdir(uploadsTarget, { recursive: true });
    }
  }

  /**
   * Erstellt Metadata-Datei mit Statistiken
   */
  private async createMetadata(backupDir: string): Promise<BackupMetadata> {
    // Statistiken aus DB
    const [users, notes, folders, noteShares, folderShares, attachments, tags] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.note.count(),
      this.prisma.folder.count(),
      this.prisma.noteShare.count(),
      this.prisma.folderShare.count(),
      this.prisma.attachment.count(),
      this.prisma.tag.count(),
    ]);

    // Datei-Größen
    const dbStat = await fs.stat(path.join(backupDir, 'database.sql'));
    const uploadsDir = path.join(backupDir, 'uploads');

    let uploadsSize = 0;
    let fileCount = 0;

    try {
      const result = await this.getDirectorySize(uploadsDir);
      uploadsSize = result.totalSize;
      fileCount = result.fileCount;
    } catch (error) {
      // Uploads dir doesn't exist or empty
    }

    return {
      version: '1.0.0', // Backup format version (wichtig für Backwards Compatibility!)
      appVersion: process.env.APP_VERSION || '1.0.0',
      createdAt: new Date(),
      type: 'data',
      database: {
        name: process.env.DATABASE_URL?.includes('postgresql') ? 'postgres' : 'sqlite',
        size: dbStat.size,
      },
      uploads: {
        fileCount,
        totalSize: uploadsSize,
      },
      statistics: {
        users,
        notes,
        folders,
        shares: noteShares + folderShares,
        attachments,
        tags,
      },
    };
  }

  /**
   * Komprimiert Verzeichnis zu .tar.gz
   */
  private async compress(sourceDir: string, targetPath: string): Promise<void> {
    await execPromise(`tar -czf "${targetPath}" -C "${sourceDir}" .`);
  }

  /**
   * Berechnet Verzeichnisgröße rekursiv
   */
  private async getDirectorySize(
    dirPath: string
  ): Promise<{ totalSize: number; fileCount: number }> {
    let totalSize = 0;
    let fileCount = 0;

    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        const subDirStats = await this.getDirectorySize(itemPath);
        totalSize += subDirStats.totalSize;
        fileCount += subDirStats.fileCount;
      } else if (item.isFile()) {
        const stats = await fs.stat(itemPath);
        totalSize += stats.size;
        fileCount++;
      }
    }

    return { totalSize, fileCount };
  }

  /**
   * Listet alle Backups auf
   */
  async listBackups(): Promise<any[]> {
    return await this.prisma.backup.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Löscht ein Backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    const backup = await this.prisma.backup.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      throw new Error('Backup not found');
    }

    // Lösche Datei
    if (backup.path) {
      const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
      const filePath = path.join(backupDir, backup.path);

      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn('Failed to delete backup file:', error);
      }
    }

    // Lösche DB-Eintrag
    await this.prisma.backup.delete({
      where: { id: backupId },
    });
  }

  /**
   * Download-Path für Backup
   */
  getBackupPath(backup: any): string {
    const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
    return path.join(backupDir, backup.path);
  }

  /**
   * Formatiert Bytes zu lesbarem Format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
