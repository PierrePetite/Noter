/**
 * Backup Provider Interface
 * Abstraction für verschiedene Backup-Ziele (Lokal, Google Drive, S3, etc.)
 */

export interface Backup {
  id: string;
  timestamp: Date;
  size: number;
  provider: string;
  path?: string;
  metadata?: {
    noteCount: number;
    userCount: number;
    folderCount: number;
    attachmentCount: number;
  };
}

export interface BackupOptions {
  includeUploads?: boolean;
  compression?: boolean;
}

export interface IBackupProvider {
  /** Name des Providers (z.B. 'local', 'gdrive', 's3') */
  readonly name: string;

  /**
   * Prüfen ob Provider konfiguriert und einsatzbereit ist
   */
  isConfigured(): Promise<boolean>;

  /**
   * Backup erstellen
   * @param options - Backup-Optionen
   */
  createBackup(options?: BackupOptions): Promise<Backup>;

  /**
   * Backup wiederherstellen
   * @param backupId - ID des Backups
   */
  restoreBackup(backupId: string): Promise<void>;

  /**
   * Alle Backups auflisten
   */
  listBackups(): Promise<Backup[]>;

  /**
   * Backup löschen
   * @param backupId - ID des Backups
   */
  deleteBackup(backupId: string): Promise<void>;

  /**
   * Backup-Zeitplan konfigurieren (Cron-Format)
   * @param schedule - Cron-String (z.B. '0 2 * * *')
   */
  scheduleBackup(schedule: string): Promise<void>;

  /**
   * Aktuellen Zeitplan abrufen
   */
  getSchedule(): Promise<string | null>;

  /**
   * Alte Backups aufräumen
   * @param retentionDays - Aufbewahrungsdauer in Tagen
   */
  cleanup(retentionDays: number): Promise<number>;
}
