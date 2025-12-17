import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { NoteService } from '../services/note.service';
import { createNoteSchema, updateNoteSchema } from '../utils/validation';
import { authMiddleware } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';

/**
 * Notes Routes
 */
export async function noteRoutes(app: FastifyInstance) {
  const noteService = new NoteService(app.prisma);

  // Alle Routes benötigen Authentifizierung
  app.addHook('preHandler', authMiddleware);

  // GET /api/notes - Alle Notizen abrufen
  app.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            folderId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: userId } = (request as AuthenticatedRequest).user;
        const { folderId } = request.query as { folderId?: string };

        const notes = await noteService.getAllNotes(userId, folderId);

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

  // GET /api/notes/favorites - Favoriten abrufen
  app.get('/favorites', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id: userId } = (request as AuthenticatedRequest).user;
      const notes = await noteService.getFavorites(userId);

      return reply.send({
        success: true,
        data: notes,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch favorites',
      });
    }
  });

  // GET /api/notes/search - Notizen durchsuchen
  app.get(
    '/search',
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

        const notes = await noteService.searchNotes(userId, q);

        return reply.send({
          success: true,
          data: notes,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to search notes',
        });
      }
    }
  );

  // GET /api/notes/:id - Einzelne Notiz abrufen
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
        const { id: noteId } = request.params as { id: string };

        const note = await noteService.getNoteById(noteId, userId);

        return reply.send({
          success: true,
          data: note,
        });
      } catch (error: any) {
        const statusCode = error.message === 'Note not found' ? 404 : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to fetch note',
        });
      }
    }
  );

  // POST /api/notes - Neue Notiz erstellen
  app.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 500 },
            content: {}, // TipTap JSON
            folderId: { type: 'string', format: 'uuid', nullable: true },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: userId } = (request as AuthenticatedRequest).user;
        const input = createNoteSchema.parse(request.body);

        const note = await noteService.createNote(input, userId);

        return reply.status(201).send({
          success: true,
          data: note,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message || 'Failed to create note',
        });
      }
    }
  );

  // PUT /api/notes/:id - Notiz aktualisieren
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
            title: { type: 'string', minLength: 1, maxLength: 500 },
            content: {},
            folderId: { type: 'string', format: 'uuid', nullable: true },
            isFavorite: { type: 'boolean' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id: userId } = (request as AuthenticatedRequest).user;
        const { id: noteId } = request.params as { id: string };
        const input = updateNoteSchema.parse(request.body);

        const note = await noteService.updateNote(noteId, input, userId);

        return reply.send({
          success: true,
          data: note,
        });
      } catch (error: any) {
        const statusCode = error.message === 'Note not found' ? 404 : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to update note',
        });
      }
    }
  );

  // DELETE /api/notes/:id - Notiz löschen
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
        const { id: noteId } = request.params as { id: string };

        await noteService.deleteNote(noteId, userId);

        return reply.send({
          success: true,
          message: 'Note deleted successfully',
        });
      } catch (error: any) {
        const statusCode = error.message === 'Note not found' ? 404 : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to delete note',
        });
      }
    }
  );

  // POST /api/notes/:id/favorite - Favoriten-Status umschalten
  app.post(
    '/:id/favorite',
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

        const note = await noteService.toggleFavorite(noteId, userId);

        return reply.send({
          success: true,
          data: note,
        });
      } catch (error: any) {
        const statusCode = error.message === 'Note not found' ? 404 : 403;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to toggle favorite',
        });
      }
    }
  );
}
