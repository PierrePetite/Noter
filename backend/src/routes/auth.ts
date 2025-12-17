import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginSchema } from '../utils/validation';
import { authMiddleware } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';

/**
 * Authentifizierungs-Routes
 */
export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app.prisma);

  // POST /api/auth/register
  app.post(
    '/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'username', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string', minLength: 3, maxLength: 30 },
            password: { type: 'string', minLength: 8 },
            displayName: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const input = registerSchema.parse(request.body);
        const result = await authService.register(input);

        return reply.status(201).send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message || 'Registration failed',
        });
      }
    }
  );

  // POST /api/auth/login
  app.post(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const input = loginSchema.parse(request.body);
        const result = await authService.login(input);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        return reply.status(401).send({
          success: false,
          error: error.message || 'Login failed',
        });
      }
    }
  );

  // GET /api/auth/me
  app.get(
    '/me',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = (request as AuthenticatedRequest).user;
        const user = await authService.getUserById(id);

        return reply.send({
          success: true,
          data: user,
        });
      } catch (error: any) {
        return reply.status(404).send({
          success: false,
          error: error.message || 'User not found',
        });
      }
    }
  );
}
