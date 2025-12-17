import { PrismaClient } from '@prisma/client';
import { PluginRegistry } from './PluginRegistry';
import { LocalStorageProvider } from '../providers/storage/LocalStorageProvider';
import { LocalBackupProvider } from '../providers/backup/LocalBackupProvider';
import { MarkdownProvider } from '../providers/import-export/MarkdownProvider';
import path from 'path';

/**
 * Initialisiert alle Provider und registriert sie in der Plugin-Registry
 */
export function initializeProviders(prisma: PrismaClient): PluginRegistry {
  const registry = PluginRegistry.getInstance();

  // Storage Provider
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

  // Konstruiere Base URL für Uploads (muss absolut sein für Frontend)
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = process.env.HOST || '0.0.0.0';
  const port = process.env.PORT || '3000';
  // Verwende localhost für 0.0.0.0 (sonst funktioniert es nicht im Browser)
  const hostname = host === '0.0.0.0' ? 'localhost' : host;
  const baseUrl = `${protocol}://${hostname}:${port}/uploads`;

  const localStorage = new LocalStorageProvider(uploadDir, baseUrl);
  registry.registerStorageProvider(localStorage);
  registry.setDefaultStorageProvider(process.env.STORAGE_PROVIDER || 'local');

  // Backup Provider
  const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
  const localBackup = new LocalBackupProvider(backupDir, uploadDir, prisma);
  registry.registerBackupProvider(localBackup);
  registry.setDefaultBackupProvider(process.env.BACKUP_PROVIDER || 'local');

  // Import/Export Provider
  const markdownProvider = new MarkdownProvider(prisma);
  registry.registerImportProvider(markdownProvider);
  registry.registerExportProvider(markdownProvider);

  // Backup-Schedule initialisieren
  if (process.env.BACKUP_ENABLED === 'true' && process.env.BACKUP_SCHEDULE) {
    localBackup.scheduleBackup(process.env.BACKUP_SCHEDULE).catch((error) => {
      console.error('Failed to schedule backup:', error);
    });
  }

  console.log('Provider initialization complete:');
  console.log(JSON.stringify(registry.getProviderStatus(), null, 2));

  return registry;
}
