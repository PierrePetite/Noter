import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';
import { IBackupProvider, Backup, BackupOptions } from './BackupProvider.interface';
import { PrismaClient } from '@prisma/client';
import * as cron from 'node-cron';

const execAsync = promisify(exec);

export class LocalBackupProvider implements IBackupProvider {
  readonly name = 'local';
  private backupDir: string;
  private prisma: PrismaClient;
  private uploadDir: string;
  private cronJob: cron.ScheduledTask | null = null;

  constructor(backupDir: string, uploadDir: string, prisma: PrismaClient) {
    this.backupDir = backupDir;
    this.uploadDir = uploadDir;
    this.prisma = prisma;
  }

  async isConfigured(): Promise<boolean> {
    try {
      await fs.access(this.backupDir);
      return true;
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
      return true;
    }
  }

  async createBackup(options?: BackupOptions): Promise<Backup> {
    const timestamp = new Date();
    const backupId = `backup_${timestamp.getTime()}`;
    const backupPath = path.join(this.backupDir, `${backupId}.tar.gz`);

    // Erstelle temporäres Verzeichnis für Backup
    const tempDir = path.join(this.backupDir, backupId);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // 1. Datenbank exportieren
      const dbBackupPath = path.join(tempDir, 'database.sql');
      await this.exportDatabase(dbBackupPath);

      // 2. Optional: Uploads kopieren
      if (options?.includeUploads !== false) {
        const uploadsBackupPath = path.join(tempDir, 'uploads');
        await this.copyDirectory(this.uploadDir, uploadsBackupPath);
      }

      // 3. Metadaten sammeln
      const metadata = await this.collectMetadata();
      await fs.writeFile(
        path.join(tempDir, 'metadata.json'),
        JSON.stringify({ ...metadata, timestamp, options }, null, 2)
      );

      // 4. Archiv erstellen
      const size = await this.createArchive(tempDir, backupPath);

      // 5. Temp-Verzeichnis aufräumen
      await fs.rm(tempDir, { recursive: true, force: true });

      // 6. Backup in Datenbank speichern
      const backup = await this.prisma.backup.create({
        data: {
          id: backupId,
          provider: this.name,
          size,
          path: backupPath,
          metadata: metadata as any,
          status: 'COMPLETED',
        },
      });

      return {
        id: backup.id,
        timestamp: backup.createdAt,
        size: backup.size,
        provider: backup.provider,
        path: backup.path || undefined,
        metadata: metadata,
      };
    } catch (error) {
      // Aufräumen bei Fehler
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      throw new Error(`Backup failed: ${error}`);
    }
  }

  async restoreBackup(backupId: string): Promise<void> {
    const backup = await this.prisma.backup.findUnique({
      where: { id: backupId },
    });

    if (!backup || !backup.path) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    const tempDir = path.join(this.backupDir, `restore_${Date.now()}`);

    try {
      // 1. Archiv extrahieren
      await this.extractArchive(backup.path, tempDir);

      // 2. Datenbank wiederherstellen
      const dbBackupPath = path.join(tempDir, 'database.sql');
      await this.importDatabase(dbBackupPath);

      // 3. Uploads wiederherstellen
      const uploadsBackupPath = path.join(tempDir, 'uploads');
      try {
        await fs.access(uploadsBackupPath);
        await this.copyDirectory(uploadsBackupPath, this.uploadDir);
      } catch {
        // Uploads nicht im Backup enthalten
      }

      // 4. Aufräumen
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      throw new Error(`Restore failed: ${error}`);
    }
  }

  async listBackups(): Promise<Backup[]> {
    const backups = await this.prisma.backup.findMany({
      where: { provider: this.name },
      orderBy: { createdAt: 'desc' },
    });

    return backups.map((b) => ({
      id: b.id,
      timestamp: b.createdAt,
      size: b.size,
      provider: b.provider,
      path: b.path || undefined,
      metadata: b.metadata as any,
    }));
  }

  async deleteBackup(backupId: string): Promise<void> {
    const backup = await this.prisma.backup.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    // Lösche Datei
    if (backup.path) {
      try {
        await fs.unlink(backup.path);
      } catch {
        // Datei existiert nicht mehr
      }
    }

    // Lösche Datenbank-Eintrag
    await this.prisma.backup.delete({
      where: { id: backupId },
    });
  }

  async scheduleBackup(schedule: string): Promise<void> {
    // Validiere Cron-Expression
    if (!cron.validate(schedule)) {
      throw new Error(`Invalid cron expression: ${schedule}`);
    }

    // Stoppe existierenden Job
    if (this.cronJob) {
      this.cronJob.stop();
    }

    // Starte neuen Job
    this.cronJob = cron.schedule(schedule, async () => {
      try {
        await this.createBackup();
        console.log(`Scheduled backup completed at ${new Date().toISOString()}`);
      } catch (error) {
        console.error(`Scheduled backup failed: ${error}`);
      }
    });
  }

  async getSchedule(): Promise<string | null> {
    // In einer echten Implementierung würde dies aus einer Config-Datei oder DB gelesen
    return process.env.BACKUP_SCHEDULE || null;
  }

  async cleanup(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const oldBackups = await this.prisma.backup.findMany({
      where: {
        provider: this.name,
        createdAt: { lt: cutoffDate },
      },
    });

    for (const backup of oldBackups) {
      await this.deleteBackup(backup.id);
    }

    return oldBackups.length;
  }

  // Helper-Methoden

  private async exportDatabase(outputPath: string): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    // Parse PostgreSQL URL
    const url = new URL(databaseUrl);
    const dbName = url.pathname.slice(1).split('?')[0];

    const command = `PGPASSWORD="${url.password}" pg_dump -h ${url.hostname} -p ${url.port || 5432} -U ${url.username} ${dbName} > "${outputPath}"`;

    await execAsync(command);
  }

  private async importDatabase(inputPath: string): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    const url = new URL(databaseUrl);
    const dbName = url.pathname.slice(1).split('?')[0];

    const command = `PGPASSWORD="${url.password}" psql -h ${url.hostname} -p ${url.port || 5432} -U ${url.username} ${dbName} < "${inputPath}"`;

    await execAsync(command);
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async createArchive(sourceDir: string, outputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(outputPath);
      const archive = archiver('tar', { gzip: true, gzipOptions: { level: 9 } });

      output.on('close', () => resolve(archive.pointer()));
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  private async extractArchive(archivePath: string, outputDir: string): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });
    await execAsync(`tar -xzf "${archivePath}" -C "${outputDir}"`);
  }

  private async collectMetadata() {
    const [noteCount, userCount, folderCount, attachmentCount] = await Promise.all([
      this.prisma.note.count(),
      this.prisma.user.count(),
      this.prisma.folder.count(),
      this.prisma.attachment.count(),
    ]);

    return {
      noteCount,
      userCount,
      folderCount,
      attachmentCount,
    };
  }
}
