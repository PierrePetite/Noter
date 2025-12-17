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

  // Base-URL für Upload-Dateien
  // In Production MUSS UPLOAD_BASE_URL gesetzt sein (z.B. https://noter.local/uploads)
  let baseUrl: string;

  if (process.env.UPLOAD_BASE_URL) {
    baseUrl = process.env.UPLOAD_BASE_URL;
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('UPLOAD_BASE_URL must be set in production environment');
  } else {
    // Development fallback
    const protocol = 'http';
    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || '3000';
    const hostname = host === '0.0.0.0' ? 'localhost' : host;
    baseUrl = `${protocol}://${hostname}:${port}/uploads`;
  }

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
