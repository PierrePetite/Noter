import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

async function cleanupAllData() {
  console.log('🗑️  Starting complete data cleanup...\n');

  try {
    // 1. Statistiken vor dem Löschen
    const [notesCount, foldersCount, tagsCount, attachmentsCount, usersCount] = await Promise.all([
      prisma.note.count(),
      prisma.folder.count(),
      prisma.tag.count(),
      prisma.attachment.count(),
      prisma.user.count(),
    ]);

    console.log('Current data:');
    console.log(`  - Users: ${usersCount}`);
    console.log(`  - Notes: ${notesCount}`);
    console.log(`  - Folders: ${foldersCount}`);
    console.log(`  - Tags: ${tagsCount}`);
    console.log(`  - Attachments: ${attachmentsCount}`);
    console.log('');

    // 2. Alle Shares löschen
    console.log('Deleting shares...');
    await prisma.noteShare.deleteMany({});
    await prisma.folderShare.deleteMany({});
    console.log('✓ Shares deleted');

    // 3. Alle Attachments löschen (DB-Einträge)
    console.log('Deleting attachments...');
    await prisma.attachment.deleteMany({});
    console.log('✓ Attachments deleted');

    // 4. Alle Tags-Verknüpfungen auflösen und Tags löschen
    console.log('Deleting tags...');
    await prisma.tag.deleteMany({});
    console.log('✓ Tags deleted');

    // 5. Alle Notizen löschen
    console.log('Deleting notes...');
    await prisma.note.deleteMany({});
    console.log('✓ Notes deleted');

    // 6. Alle Ordner löschen
    console.log('Deleting folders...');
    await prisma.folder.deleteMany({});
    console.log('✓ Folders deleted');

    // 7. Uploads-Verzeichnis leeren (außer .gitkeep)
    console.log('\nCleaning uploads directory...');
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const absoluteUploadDir = path.resolve(uploadDir);

    try {
      const items = await fs.readdir(absoluteUploadDir);

      for (const item of items) {
        if (item === '.gitkeep') continue;

        const itemPath = path.join(absoluteUploadDir, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          await fs.rm(itemPath, { recursive: true, force: true });
          console.log(`  ✓ Removed directory: ${item}`);
        } else {
          await fs.unlink(itemPath);
          console.log(`  ✓ Removed file: ${item}`);
        }
      }

      console.log('✓ Uploads directory cleaned');
    } catch (error) {
      console.error('Error cleaning uploads directory:', error);
    }

    console.log('\n✅ Complete data cleanup finished!');
    console.log('\nYou can now re-import your Synology backup.');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Cleanup aus
cleanupAllData()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
