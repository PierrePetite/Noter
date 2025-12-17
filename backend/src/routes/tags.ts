import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TagService } from '../services/tag.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';

/**
 * Tag Routes
 */
export async function tagRoutes(app: FastifyInstance) {
  const tagService = new TagService(app.prisma);

  // Alle Routes benötigen Authentifizierung
  app.addHook('preHandler', authMiddleware);

  // GET /api/tags - Alle Tags abrufen
  app.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tags = await tagService.getAllTags();

      return reply.send({
        success: true,
        data: tags,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch tags',
      });
    }
  });

  // POST /api/tags - Neuen Tag erstellen
  app.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 50 },
            color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { name, color } = request.body as { name: string; color?: string };
        const tag = await tagService.createTag(name, color);

        return reply.status(201).send({
          success: true,
          data: tag,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message || 'Failed to create tag',
        });
      }
    }
  );

  // GET /api/tags/:id/notes - Alle Notizen mit diesem Tag
  app.get(
    '/:id/notes',
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
        const { id: tagId } = request.params as { id: string };

        const notes = await tagService.getNotesByTag(tagId, userId);

        return reply.send({
          success: true,
          data: notes,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to fetch notes',
        });
      }
    }
  );

  // PUT /api/notes/:id/tags - Tags zu Notiz hinzufügen
  app.put(
    '/notes/:id/tags',
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
          required: ['tags'],
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: userId } = (request as AuthenticatedRequest).user;
        const { id: noteId } = request.params as { id: string };
        const { tags } = request.body as { tags: string[] };

        const note = await tagService.addTagsToNote(noteId, tags, userId);

        return reply.send({
          success: true,
          data: note,
        });
      } catch (error: any) {
        const statusCode = error.message === 'Note not found' ? 404 : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to add tags',
        });
      }
    }
  );

  // DELETE /api/notes/:id/tags - Tags von Notiz entfernen
  app.delete(
    '/notes/:id/tags',
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
          required: ['tagIds'],
          properties: {
            tagIds: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: userId } = (request as AuthenticatedRequest).user;
        const { id: noteId } = request.params as { id: string };
        const { tagIds } = request.body as { tagIds: string[] };

        const note = await tagService.removeTagsFromNote(noteId, tagIds, userId);

        return reply.send({
          success: true,
          data: note,
        });
      } catch (error: any) {
        const statusCode = error.message === 'Note not found' ? 404 : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to remove tags',
        });
      }
    }
  );
}
