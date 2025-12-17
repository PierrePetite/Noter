import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { FolderService } from '../services/folder.service';
import { createFolderSchema } from '../utils/validation';
import { authMiddleware } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';

/**
 * Folder Routes
 */
export async function folderRoutes(app: FastifyInstance) {
  const folderService = new FolderService(app.prisma);

  // Alle Routes benötigen Authentifizierung
  app.addHook('preHandler', authMiddleware);

  // GET /api/folders - Alle Ordner abrufen (flache Liste)
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id: userId } = (request as AuthenticatedRequest).user;
      const folders = await folderService.getAllFolders(userId);

      return reply.send({
        success: true,
        data: folders,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch folders',
      });
    }
  });

  // GET /api/folders/tree - Ordner-Baum (hierarchisch)
  app.get('/tree', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id: userId } = (request as AuthenticatedRequest).user;
      const tree = await folderService.getFolderTree(userId);

      return reply.send({
        success: true,
        data: tree,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch folder tree',
      });
    }
  });

  // GET /api/folders/:id - Einzelnen Ordner abrufen (mit Notizen)
  app.get(
    '/:id',
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
        const { id: folderId } = request.params as { id: string };

        const folder = await folderService.getFolderById(folderId, userId);

        return reply.send({
          success: true,
          data: folder,
        });
      } catch (error: any) {
        const statusCode = error.message === 'Folder not found' ? 404 : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to fetch folder',
        });
      }
    }
  );

  // POST /api/folders - Neuen Ordner erstellen
  app.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            parentId: { type: 'string', format: 'uuid', nullable: true },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: userId } = (request as AuthenticatedRequest).user;
        const input = createFolderSchema.parse(request.body);

        const folder = await folderService.createFolder(input, userId);

        return reply.status(201).send({
          success: true,
          data: folder,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message || 'Failed to create folder',
        });
      }
    }
  );

  // PUT /api/folders/:id - Ordner umbenennen/verschieben
  app.put(
    '/:id',
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
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            parentId: { type: 'string', format: 'uuid', nullable: true },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: userId } = (request as AuthenticatedRequest).user;
        const { id: folderId } = request.params as { id: string };
        const input = request.body as Partial<{ name: string; parentId: string | null }>;

        const folder = await folderService.updateFolder(folderId, input, userId);

        return reply.send({
          success: true,
          data: folder,
        });
      } catch (error: any) {
        const statusCode = error.message === 'Folder not found' ? 404 : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to update folder',
        });
      }
    }
  );

  // DELETE /api/folders/:id - Ordner löschen
  app.delete(
    '/:id',
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
        const { id: folderId } = request.params as { id: string };

        await folderService.deleteFolder(folderId, userId);

        return reply.send({
          success: true,
          message: 'Folder deleted successfully',
        });
      } catch (error: any) {
        const statusCode = error.message === 'Folder not found' ? 404 : 400;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to delete folder',
        });
      }
    }
  );
}
