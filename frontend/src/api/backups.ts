import apiClient from './client';

export interface Backup {
  id: string;
  type: 'MANUAL' | 'SCHEDULED';
  provider: string;
  size: number;
  path: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  error?: string;
  metadata?: {
    version: string;
    appVersion: string;
    statistics: {
      users: number;
      notes: number;
      folders: number;
      shares: number;
      attachments: number;
      tags: number;
    };
    uploads: {
      fileCount: number;
      totalSize: number;
    };
  };
  createdAt: string;
}

export interface BackupSchedule {
  id: string;
  enabled: boolean;
  cronSchedule: string;
  provider: string;
  retention: number;
  lastRun: string | null;
  nextRun: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CronValidationResult {
  valid: boolean;
  expression: string;
  description: string | null;
}

export const backupsApi = {
  // Liste alle Backups
  async getAll(): Promise<Backup[]> {
    const response = await apiClient.get<{ success: boolean; data: Backup[] }>('/backups');
    return response.data.data;
  },

  // Erstelle neues Backup
  async create(): Promise<Backup> {
    const response = await apiClient.post<{ success: boolean; data: Backup }>('/backups');
    return response.data.data;
  },

  // Download Backup
  async download(backupId: string): Promise<Blob> {
    const response = await apiClient.get(`/backups/${backupId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Lösche Backup
  async delete(backupId: string): Promise<void> {
    await apiClient.delete(`/backups/${backupId}`);
  },

  // Hole Scheduler-Konfiguration
  async getSchedule(): Promise<BackupSchedule> {
    const response = await apiClient.get<{ success: boolean; data: BackupSchedule }>(
      '/backups/schedule'
    );
    return response.data.data;
  },

  // Aktualisiere Scheduler-Konfiguration
  async updateSchedule(schedule: {
    enabled?: boolean;
    cronSchedule?: string;
    provider?: string;
    retention?: number;
  }): Promise<BackupSchedule> {
    const response = await apiClient.put<{ success: boolean; data: BackupSchedule }>(
      '/backups/schedule',
      schedule
    );
    return response.data.data;
  },

  // Validiere Cron-Expression
  async validateCron(expression: string): Promise<CronValidationResult> {
    const response = await apiClient.get<{ success: boolean; data: CronValidationResult }>(
      '/backups/schedule/validate',
      {
        params: { expression },
      }
    );
    return response.data.data;
  },
};
