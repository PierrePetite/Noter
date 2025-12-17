import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { SynologyImportProvider, type SynologyImportResult } from '../providers/import-export/SynologyImportProvider';
import { authMiddleware } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

const importRoutes: FastifyPluginAsync = async (fastify) => {
  // Alle Routes benötigen Authentifizierung
  fastify.addHook('preHandler', authMiddleware);
  /**
   * POST /api/import/synology
   * Importiert eine Synology NoteStation Backup-Datei (.nsx)
   */
  fastify.post('/synology', async (request, reply) => {
    try {
      const userId = (request as AuthenticatedRequest).user.id;

      // Multipart-Upload verarbeiten
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ success: false, error: 'No file uploaded' });
      }

      // Prüfe Dateiendung
      if (!data.filename.endsWith('.nsx')) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid file format. Only .nsx files are supported.',
        });
      }

      // Speichere temporär die hochgeladene Datei
      const tempDir = path.join(os.tmpdir(), 'noter_uploads');
      await fs.mkdir(tempDir, { recursive: true });

      const tempFilePath = path.join(tempDir, `${Date.now()}_${data.filename}`);
      await pipeline(data.file, createWriteStream(tempFilePath));

      // Import durchführen
      const importProvider = new SynologyImportProvider(prisma);
      const result: SynologyImportResult = await importProvider.import(tempFilePath, {
        userId,
        preserveTimestamps: true,
        skipErrors: true, // Fehlerhafte Notizen überspringen
      });

      // Temporäre Datei löschen
      await fs.unlink(tempFilePath);

      return reply.send({
        success: result.success,
        data: {
          notesCreated: result.notesCreated,
          foldersCreated: result.foldersCreated,
          attachmentsImported: result.attachmentsImported,
          errors: result.errors,
        },
      });
    } catch (error: any) {
      console.error('Import error:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Import failed',
      });
    }
  });

  /**
   * GET /api/import/formats
   * Gibt alle unterstützten Import-Formate zurück
   */
  fastify.get('/formats', async (_request, reply) => {
    return reply.send({
      success: true,
      data: {
        formats: [
          {
            id: 'synology',
            name: 'Synology NoteStation',
            extension: '.nsx',
            description: 'Import from Synology NoteStation backup files',
          },
        ],
      },
    });
  });
};

export default importRoutes;
