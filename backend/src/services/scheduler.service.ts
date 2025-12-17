import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { BackupService } from './backup.service';

/**
 * Backup Scheduler Service
 * Verwaltet automatische Backups via Cron-Jobs
 */
export class SchedulerService {
  private cronJob: cron.ScheduledTask | null = null;

  constructor(
    private prisma: PrismaClient,
    private backupService: BackupService
  ) {}

  /**
   * Startet den Scheduler basierend auf DB-Konfiguration
   */
  async start(): Promise<void> {
    const schedule = await this.getSchedule();

    if (!schedule || !schedule.enabled) {
      console.log('📅 Backup Scheduler: Disabled');
      return;
    }

    // Validiere Cron-Expression
    if (!cron.validate(schedule.cronSchedule)) {
      console.error('❌ Invalid cron expression:', schedule.cronSchedule);
      return;
    }

    // Stoppe existierenden Job
    this.stop();

    // Starte neuen Cron-Job
    this.cronJob = cron.schedule(schedule.cronSchedule, async () => {
      console.log('⏰ Scheduled backup starting...');
      try {
        await this.runScheduledBackup();
      } catch (error) {
        console.error('❌ Scheduled backup failed:', error);
      }
    });

    console.log(`✅ Backup Scheduler: Started with schedule "${schedule.cronSchedule}"`);
    console.log(`   Provider: ${schedule.provider}`);
    console.log(`   Retention: ${schedule.retention} days`);

    // Berechne nächsten Run
    await this.updateNextRun(schedule.id, schedule.cronSchedule);
  }

  /**
   * Stoppt den Scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('🛑 Backup Scheduler: Stopped');
    }
  }

  /**
   * Führt ein geplantes Backup durch
   */
  private async runScheduledBackup(): Promise<void> {
    const schedule = await this.getSchedule();
    if (!schedule) return;

    try {
      // Backup erstellen
      const backup = await this.backupService.createBackup('SCHEDULED');
      console.log(`✅ Scheduled backup created: ${backup.id}`);

      // Aktualisiere lastRun
      await this.prisma.backupSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRun: new Date(),
        },
      });

      // Berechne nächsten Run
      await this.updateNextRun(schedule.id, schedule.cronSchedule);

      // Retention Policy: Lösche alte Backups
      if (schedule.retention > 0) {
        await this.cleanupOldBackups(schedule.retention);
      }
    } catch (error) {
      console.error('❌ Scheduled backup failed:', error);
      throw error;
    }
  }

  /**
   * Löscht alte Backups basierend auf Retention Policy
   */
  private async cleanupOldBackups(retentionDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const oldBackups = await this.prisma.backup.findMany({
      where: {
        type: 'SCHEDULED',
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    for (const backup of oldBackups) {
      try {
        await this.backupService.deleteBackup(backup.id);
        console.log(`🗑️  Deleted old backup: ${backup.id} (${backup.createdAt})`);
      } catch (error) {
        console.warn('Failed to delete old backup:', backup.id, error);
      }
    }

    if (oldBackups.length > 0) {
      console.log(`✅ Retention cleanup: Removed ${oldBackups.length} old backup(s)`);
    }
  }

  /**
   * Berechnet und speichert nächsten Ausführungszeitpunkt
   */
  private async updateNextRun(scheduleId: string, cronExpression: string): Promise<void> {
    try {
      // Cron-Parser für nächsten Run
      const interval = cron.schedule(cronExpression, () => {});

      // Berechne nächste Ausführung (approximation)
      const nextRun = this.getNextCronRun(cronExpression);

      await this.prisma.backupSchedule.update({
        where: { id: scheduleId },
        data: { nextRun },
      });

      interval.stop();
    } catch (error) {
      console.warn('Could not calculate next run:', error);
    }
  }

  /**
   * Berechnet nächsten Cron-Run (vereinfachte Implementierung)
   */
  private getNextCronRun(cronExpression: string): Date {
    // Einfache Heuristik basierend auf gängigen Patterns
    const now = new Date();
    const parts = cronExpression.split(' ');

    // Täglich um X Uhr: "0 2 * * *" -> Heute/Morgen um 2:00
    if (parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
      const hour = parseInt(parts[1]);
      const minute = parseInt(parts[0]);
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);

      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    // Stündlich: "0 * * * *"
    if (parts[1] === '*' && parts[2] === '*') {
      const minute = parseInt(parts[0]);
      const next = new Date(now);
      next.setMinutes(minute, 0, 0);

      if (next <= now) {
        next.setHours(next.getHours() + 1);
      }
      return next;
    }

    // Fallback: In 1 Stunde
    const next = new Date(now);
    next.setHours(next.getHours() + 1);
    return next;
  }

  /**
   * Holt aktuelle Schedule-Konfiguration
   */
  async getSchedule(): Promise<any> {
    // Es gibt nur einen Schedule (Singleton)
    const schedules = await this.prisma.backupSchedule.findMany();
    return schedules[0] || null;
  }

  /**
   * Aktualisiert Schedule-Konfiguration
   */
  async updateSchedule(data: {
    enabled?: boolean;
    cronSchedule?: string;
    provider?: string;
    retention?: number;
  }): Promise<any> {
    // Validiere Cron-Expression wenn vorhanden
    if (data.cronSchedule && !cron.validate(data.cronSchedule)) {
      throw new Error('Invalid cron expression');
    }

    let schedule = await this.getSchedule();

    if (schedule) {
      // Update existierenden Schedule
      schedule = await this.prisma.backupSchedule.update({
        where: { id: schedule.id },
        data: {
          ...data,
          nextRun: data.cronSchedule
            ? this.getNextCronRun(data.cronSchedule)
            : schedule.nextRun,
        },
      });
    } else {
      // Erstelle ersten Schedule
      schedule = await this.prisma.backupSchedule.create({
        data: {
          enabled: data.enabled ?? false,
          cronSchedule: data.cronSchedule || '0 2 * * *', // Default: 2 AM täglich
          provider: data.provider || 'local',
          retention: data.retention ?? 30,
          nextRun: this.getNextCronRun(data.cronSchedule || '0 2 * * *'),
        },
      });
    }

    // Restart Scheduler mit neuer Konfiguration
    await this.start();

    return schedule;
  }

  /**
   * Validiert Cron-Expression
   */
  validateCronExpression(expression: string): boolean {
    return cron.validate(expression);
  }

  /**
   * Human-readable Beschreibung von Cron-Expression
   */
  describeCronExpression(expression: string): string {
    const parts = expression.split(' ');

    // Täglich
    if (parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
      const hour = parts[1];
      const minute = parts[0];
      return `Täglich um ${hour}:${minute.padStart(2, '0')} Uhr`;
    }

    // Wöchentlich
    if (parts[4] !== '*') {
      const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
      const dayNumber = parseInt(parts[4]);
      const hour = parts[1];
      const minute = parts[0];
      return `Jeden ${days[dayNumber]} um ${hour}:${minute.padStart(2, '0')} Uhr`;
    }

    // Monatlich
    if (parts[2] !== '*' && parts[3] === '*') {
      const day = parts[2];
      const hour = parts[1];
      const minute = parts[0];
      return `Jeden ${day}. des Monats um ${hour}:${minute.padStart(2, '0')} Uhr`;
    }

    // Stündlich
    if (parts[1] === '*' && parts[2] === '*') {
      const minute = parts[0];
      return `Stündlich zur Minute ${minute}`;
    }

    return expression;
  }
}
