import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AttachmentService } from '../services/attachment.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';

/**
 * Attachment Routes
 */
export async function attachmentRoutes(app: FastifyInstance) {
  const attachmentService = new AttachmentService(app.prisma, app.registry);

  // Alle Routes benötigen Authentifizierung
  app.addHook('preHandler', authMiddleware);

  // POST /api/notes/:id/attachments - Datei zu Notiz hochladen
  app.post(
    '/notes/:id/attachments',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: userId } = (request as AuthenticatedRequest).user;
        const { id: noteId } = request.params as { id: string };

        // Multipart-Daten abrufen
        const data = await request.file();

        if (!data) {
          return reply.status(400).send({
            success: false,
            error: 'No file provided',
          });
        }

        // Datei-Buffer erstellen
        const fileBuffer = await data.toBuffer();

        const attachment = await attachmentService.uploadAttachment(noteId, userId, {
          filename: data.filename,
          mimetype: data.mimetype,
          data: fileBuffer,
        });

        return reply.status(201).send({
          success: true,
          data: attachment,
        });
      } catch (error: any) {
        const statusCode = error.message === 'Note not found' ? 404 : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to upload attachment',
        });
      }
    }
  );

  // GET /api/notes/:id/attachments - Alle Attachments einer Notiz
  app.get(
    '/notes/:id/attachments',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: userId } = (request as AuthenticatedRequest).user;
        const { id: noteId } = request.params as { id: string };

        const attachments = await attachmentService.getAttachmentsByNote(noteId, userId);

        return reply.send({
          success: true,
          data: attachments,
        });
      } catch (error: any) {
        const statusCode = error.message === 'Note not found' ? 404 : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to fetch attachments',
        });
      }
    }
  );

  // GET /api/attachments/:id - Attachment herunterladen
  app.get(
    '/attachments/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: userId } = (request as AuthenticatedRequest).user;
        const { id: attachmentId } = request.params as { id: string };

        const file = await attachmentService.downloadAttachment(attachmentId, userId);

        return reply
          .header('Content-Type', file.mimeType)
          .header('Content-Disposition', `attachment; filename="${file.filename}"`)
          .send(file.data);
      } catch (error: any) {
        const statusCode = error.message === 'Attachment not found' ? 404 : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to download attachment',
        });
      }
    }
  );

  // DELETE /api/attachments/:id - Attachment löschen
  app.delete(
    '/attachments/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: userId } = (request as AuthenticatedRequest).user;
        const { id: attachmentId } = request.params as { id: string };

        await attachmentService.deleteAttachment(attachmentId, userId);

        return reply.send({
          success: true,
          message: 'Attachment deleted successfully',
        });
      } catch (error: any) {
        const statusCode = error.message === 'Attachment not found' ? 404 : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to delete attachment',
        });
      }
    }
  );

  // POST /api/upload/image - Bild hochladen (für Editor)
  app.post('/upload/image', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id: userId } = (request as AuthenticatedRequest).user;

      // Multipart-Daten abrufen
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          error: 'No file provided',
        });
      }

      // Datei-Buffer erstellen
      const fileBuffer = await data.toBuffer();

      const image = await attachmentService.uploadImage(userId, {
        filename: data.filename,
        mimetype: data.mimetype,
        data: fileBuffer,
      });

      return reply.status(201).send({
        success: true,
        data: image,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message || 'Failed to upload image',
      });
    }
  });
}
