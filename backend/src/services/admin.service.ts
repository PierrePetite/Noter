import { PrismaClient } from '@prisma/client';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SystemStats {
  // Benutzer & Content
  users: {
    total: number;
    active30Days: number;
  };
  notes: {
    total: number;
    createdToday: number;
    createdThisWeek: number;
    createdThisMonth: number;
  };
  folders: {
    total: number;
  };
  tags: {
    total: number;
  };
  shares: {
    noteShares: number;
    folderShares: number;
  };

  // Speicher
  storage: {
    totalUsed: number; // Bytes
    totalUsedFormatted: string;
    fileCount: number;
    largestFiles: Array<{
      filename: string;
      size: number;
      sizeFormatted: string;
      noteId?: string;
      noteTitle?: string;
    }>;
  };

  // System (LXC Container)
  system: {
    platform: string;
    nodeVersion: string;
    uptime: number; // Sekunden
    uptimeFormatted: string;
    cpu: {
      model: string;
      cores: number;
      usage: number; // Prozent (geschätzt)
    };
    memory: {
      total: number; // Bytes
      free: number; // Bytes
      used: number; // Bytes
      usagePercent: number;
      totalFormatted: string;
      freeFormatted: string;
      usedFormatted: string;
    };
  };

  // Aktivität
  activity: {
    recentLogins: Array<{
      username: string;
      email: string;
      lastActivity: Date;
    }>;
  };
}

export class AdminService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Sammelt alle System-Statistiken
   */
  async getSystemStats(): Promise<SystemStats> {
    const [
      userStats,
      noteStats,
      folderStats,
      tagStats,
      shareStats,
      storageStats,
      systemStats,
      activityStats,
    ] = await Promise.all([
      this.getUserStats(),
      this.getNoteStats(),
      this.getFolderStats(),
      this.getTagStats(),
      this.getShareStats(),
      this.getStorageStats(),
      this.collectSystemStats(),
      this.getActivityStats(),
    ]);

    return {
      users: userStats,
      notes: noteStats,
      folders: folderStats,
      tags: tagStats,
      shares: shareStats,
      storage: storageStats,
      system: systemStats,
      activity: activityStats,
    };
  }

  /**
   * Benutzer-Statistiken
   */
  private async getUserStats() {
    const totalUsers = await this.prisma.user.count();

    // Aktive Benutzer (letzte 30 Tage)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await this.prisma.user.count({
      where: {
        updatedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return {
      total: totalUsers,
      active30Days: activeUsers,
    };
  }

  /**
   * Notizen-Statistiken
   */
  private async getNoteStats() {
    const totalNotes = await this.prisma.note.count();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [createdToday, createdThisWeek, createdThisMonth] = await Promise.all([
      this.prisma.note.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.note.count({
        where: { createdAt: { gte: weekStart } },
      }),
      this.prisma.note.count({
        where: { createdAt: { gte: monthStart } },
      }),
    ]);

    return {
      total: totalNotes,
      createdToday,
      createdThisWeek,
      createdThisMonth,
    };
  }

  /**
   * Ordner-Statistiken
   */
  private async getFolderStats() {
    const totalFolders = await this.prisma.folder.count();

    return {
      total: totalFolders,
    };
  }

  /**
   * Tag-Statistiken
   */
  private async getTagStats() {
    const totalTags = await this.prisma.tag.count();

    return {
      total: totalTags,
    };
  }

  /**
   * Freigabe-Statistiken
   */
  private async getShareStats() {
    const [noteShares, folderShares] = await Promise.all([
      this.prisma.noteShare.count(),
      this.prisma.folderShare.count(),
    ]);

    return {
      noteShares,
      folderShares,
    };
  }

  /**
   * Speicher-Statistiken
   */
  private async getStorageStats() {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const absoluteUploadDir = path.resolve(uploadDir);

    try {
      const { totalSize, fileCount, largestFiles } = await this.getDirectorySize(
        absoluteUploadDir
      );

      // Top 5 größte Dateien mit Notiz-Information
      const topFiles = largestFiles.slice(0, 5);
      const filesWithNotes = await Promise.all(
        topFiles.map(async (file) => {
          const relativePath = path.relative(absoluteUploadDir, file.path);
          const filename = path.basename(file.path);

          // 1. Versuche Attachment in DB zu finden
          const attachment = await this.prisma.attachment.findFirst({
            where: {
              path: relativePath,
            },
            include: {
              note: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          });

          if (attachment) {
            return {
              filename,
              size: file.size,
              sizeFormatted: this.formatBytes(file.size),
              noteId: attachment.note.id,
              noteTitle: attachment.note.title,
            };
          }

          // 2. Suche in Notizen-Content nach Bild-URL (für inline Bilder)
          // Bilder werden als http://localhost:3000/uploads/... oder nur Dateiname in TipTap gespeichert
          const notes = await this.prisma.note.findMany({
            select: {
              id: true,
              title: true,
              content: true,
            },
          });

          // Durchsuche Content - nutze nur den Dateinamen für besseres Matching
          // (da die URLs http://localhost:3000/uploads/... enthalten können)
          for (const note of notes) {
            const contentStr = JSON.stringify(note.content);
            // Prüfe nur auf Dateinamen - das ist der eindeutigste Teil
            if (contentStr.includes(filename)) {
              return {
                filename,
                size: file.size,
                sizeFormatted: this.formatBytes(file.size),
                noteId: note.id,
                noteTitle: note.title,
              };
            }
          }

          // 3. Keine Notiz gefunden
          return {
            filename,
            size: file.size,
            sizeFormatted: this.formatBytes(file.size),
            noteId: undefined,
            noteTitle: undefined,
          };
        })
      );

      return {
        totalUsed: totalSize,
        totalUsedFormatted: this.formatBytes(totalSize),
        fileCount,
        largestFiles: filesWithNotes,
      };
    } catch (error) {
      console.error('Error calculating storage stats:', error);
      return {
        totalUsed: 0,
        totalUsedFormatted: '0 B',
        fileCount: 0,
        largestFiles: [],
      };
    }
  }

  /**
   * Rekursive Berechnung der Verzeichnisgröße
   */
  private async getDirectorySize(
    dirPath: string
  ): Promise<{
    totalSize: number;
    fileCount: number;
    largestFiles: Array<{ path: string; size: number }>;
  }> {
    let totalSize = 0;
    let fileCount = 0;
    const largestFiles: Array<{ path: string; size: number }> = [];

    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          const subDirStats = await this.getDirectorySize(itemPath);
          totalSize += subDirStats.totalSize;
          fileCount += subDirStats.fileCount;
          largestFiles.push(...subDirStats.largestFiles);
        } else if (item.isFile()) {
          const stats = await fs.stat(itemPath);
          totalSize += stats.size;
          fileCount++;
          largestFiles.push({ path: itemPath, size: stats.size });
        }
      }

      // Sortiere nach Größe (absteigend)
      largestFiles.sort((a, b) => b.size - a.size);

      return { totalSize, fileCount, largestFiles };
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
      return { totalSize: 0, fileCount: 0, largestFiles: [] };
    }
  }

  /**
   * System-Statistiken (LXC Container)
   */
  private async collectSystemStats() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;

    // CPU-Auslastung schätzen (vereinfacht)
    const cpuUsage = await this.getCpuUsage();

    return {
      platform: `${os.platform()} ${os.release()}`,
      nodeVersion: process.version,
      uptime: os.uptime(),
      uptimeFormatted: this.formatUptime(os.uptime()),
      cpu: {
        model: cpus[0]?.model || 'Unknown',
        cores: cpus.length,
        usage: cpuUsage,
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: Math.round(memUsagePercent),
        totalFormatted: this.formatBytes(totalMem),
        freeFormatted: this.formatBytes(freeMem),
        usedFormatted: this.formatBytes(usedMem),
      },
    };
  }

  /**
   * Vereinfachte CPU-Auslastung (Durchschnitt über alle Cores)
   */
  private async getCpuUsage(): Promise<number> {
    const cpus = os.cpus();

    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - (100 * idle) / total;

    return Math.round(usage);
  }

  /**
   * Aktivitäts-Statistiken
   */
  private async getActivityStats() {
    // Letzte 5 aktive Benutzer
    const recentUsers = await this.prisma.user.findMany({
      take: 5,
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        username: true,
        email: true,
        updatedAt: true,
      },
    });

    return {
      recentLogins: recentUsers.map((user) => ({
        username: user.username,
        email: user.email,
        lastActivity: user.updatedAt,
      })),
    };
  }

  /**
   * Formatiert Bytes zu lesbarem Format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Formatiert Uptime zu lesbarem Format
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '< 1m';
  }
}
