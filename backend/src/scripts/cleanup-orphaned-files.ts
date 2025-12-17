import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Script zum Aufräumen verwaister Dateien
 * Löscht alle Dateien im Upload-Verzeichnis, die nicht mehr in der Datenbank referenziert sind
 */

const prisma = new PrismaClient();

async function cleanupOrphanedFiles() {
  console.log('🧹 Starting cleanup of orphaned files...\n');

  const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
  console.log(`📂 Upload directory: ${uploadDir}\n`);

  try {
    // Alle Attachment-Pfade aus der Datenbank abrufen
    const attachments = await prisma.attachment.findMany({
      select: {
        path: true,
      },
    });

    const validPaths = new Set(attachments.map((att) => att.path));
    console.log(`✅ Found ${validPaths.size} valid files in database\n`);

    // Alle Dateien im Upload-Verzeichnis durchsuchen (rekursiv)
    let totalFiles = 0;
    let deletedFiles = 0;
    let deletedSize = 0;

    async function scanDirectory(dir: string) {
      const files = await fs.readdir(dir, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const relativePath = path.relative(uploadDir, fullPath);

        if (file.isFile()) {
          totalFiles++;

          // Prüfen ob Datei in DB existiert
          // .meta.json Dateien gehören zur Hauptdatei - wenn Hauptdatei nicht existiert, löschen
          const isMetaFile = file.name.endsWith('.meta.json');
          const mainFilePath = isMetaFile
            ? relativePath.replace('.meta.json', '')
            : relativePath;

          if (!validPaths.has(mainFilePath)) {
            try {
              const stats = await fs.stat(fullPath);
              await fs.unlink(fullPath);
              deletedFiles++;
              deletedSize += stats.size;
              console.log(`🗑️  Deleted: ${relativePath} (${formatBytes(stats.size)})`);
            } catch (error) {
              console.error(`❌ Failed to delete ${relativePath}:`, error);
            }
          }
        } else if (file.isDirectory()) {
          // Rekursiv in Unterordner scannen
          await scanDirectory(fullPath);
        }
      }
    }

    await scanDirectory(uploadDir);

    console.log('\n📊 Cleanup Summary:');
    console.log(`   Total files scanned: ${totalFiles}`);
    console.log(`   Files deleted: ${deletedFiles}`);
    console.log(`   Space freed: ${formatBytes(deletedSize)}`);
    console.log(`   Files remaining: ${totalFiles - deletedFiles}`);
    console.log('\n✨ Cleanup completed!\n');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Script ausführen
cleanupOrphanedFiles();
