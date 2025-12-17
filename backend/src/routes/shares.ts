import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ShareService } from '../services/share.service';
import { shareSchema } from '../utils/validation';
import { authMiddleware } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';

/**
 * Share Routes
 */
export async function shareRoutes(app: FastifyInstance) {
  const shareService = new ShareService(app.prisma);

  // Alle Routes benötigen Authentifizierung
  app.addHook('preHandler', authMiddleware);

  // POST /api/notes/:id/share - Notiz teilen
  app.post(
    '/notes/:id/share',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['userId', 'permission'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            permission: { type: 'string', enum: ['READ', 'WRITE'] },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: ownerId } = (request as AuthenticatedRequest).user;
        const { id: noteId } = request.params as { id: string };
        const input = shareSchema.parse(request.body);

        const share = await shareService.shareNote(
          noteId,
          input.userId,
          input.permission,
          ownerId
        );

        return reply.status(201).send({
          success: true,
          data: share,
        });
      } catch (error: any) {
        const statusCode =
          error.message === 'Note not found' || error.message === 'Target user not found'
            ? 404
            : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to share note',
        });
      }
    }
  );

  // DELETE /api/notes/:id/share/:userId - Notiz-Freigabe entfernen
  app.delete(
    '/notes/:id/share/:userId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'userId'],
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: ownerId } = (request as AuthenticatedRequest).user;
        const { id: noteId, userId: targetUserId } = request.params as {
          id: string;
          userId: string;
        };

        await shareService.unshareNote(noteId, targetUserId, ownerId);

        return reply.send({
          success: true,
          message: 'Share removed successfully',
        });
      } catch (error: any) {
        const statusCode = error.message === 'Note not found' ? 404 : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to remove share',
        });
      }
    }
  );

  // POST /api/folders/:id/share - Ordner teilen
  app.post(
    '/folders/:id/share',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['userId', 'permission'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            permission: { type: 'string', enum: ['READ', 'WRITE'] },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: ownerId } = (request as AuthenticatedRequest).user;
        const { id: folderId } = request.params as { id: string };
        const input = shareSchema.parse(request.body);

        const share = await shareService.shareFolder(
          folderId,
          input.userId,
          input.permission,
          ownerId
        );

        return reply.status(201).send({
          success: true,
          data: share,
        });
      } catch (error: any) {
        const statusCode =
          error.message === 'Folder not found' || error.message === 'Target user not found'
            ? 404
            : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to share folder',
        });
      }
    }
  );

  // DELETE /api/folders/:id/share/:userId - Ordner-Freigabe entfernen
  app.delete(
    '/folders/:id/share/:userId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'userId'],
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: ownerId } = (request as AuthenticatedRequest).user;
        const { id: folderId, userId: targetUserId } = request.params as {
          id: string;
          userId: string;
        };

        await shareService.unshareFolder(folderId, targetUserId, ownerId);

        return reply.send({
          success: true,
          message: 'Share removed successfully',
        });
      } catch (error: any) {
        const statusCode = error.message === 'Folder not found' ? 404 : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to remove share',
        });
      }
    }
  );

  // GET /api/shares/with-me - Mit mir geteilte Inhalte
  app.get('/with-me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id: userId } = (request as AuthenticatedRequest).user;
      const shared = await shareService.getSharedWithMe(userId);

      return reply.send({
        success: true,
        data: shared,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch shared content',
      });
    }
  });

  // GET /api/shares/users/search - Benutzer für Freigabe suchen
  app.get(
    '/users/search',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: userId } = (request as AuthenticatedRequest).user;
        const { q } = request.query as { q: string };

        const users = await shareService.searchUsers(q, userId);

        return reply.send({
          success: true,
          data: users,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to search users',
        });
      }
    }
  );
}
