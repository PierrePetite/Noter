import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SetupService } from '../services/setup.service';

/**
 * Setup Routes (kein Auth erforderlich für Setup)
 */
export async function setupRoutes(app: FastifyInstance) {
  const setupService = new SetupService(app.prisma);

  // GET /api/setup/status - Prüft ob Setup erforderlich ist
  app.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const setupRequired = await setupService.isSetupRequired();
      const stats = await setupService.getSystemStats();

      return reply.send({
        success: true,
        data: {
          setupRequired,
          stats,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to check setup status',
      });
    }
  });

  // POST /api/setup/init - Initialisiert die Anwendung
  app.post(
    '/init',
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
        const data = request.body as {
          email: string;
          username: string;
          password: string;
          displayName?: string;
        };

        const result = await setupService.initializeApp(data);

        return reply.status(201).send({
          success: true,
          data: result,
          message: 'Setup completed successfully',
        });
      } catch (error: any) {
        const statusCode = error.message === 'Setup already completed' ? 409 : 400;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Setup failed',
        });
      }
    }
  );
}
