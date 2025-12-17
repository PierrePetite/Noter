import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdminService } from '../services/admin.service';
import { UserManagementService, CreateUserDto, UpdateUserDto } from '../services/user-management.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

/**
 * Admin Routes
 * Alle Routes benötigen Authentication + Admin-Rechte
 */
export async function adminRoutes(app: FastifyInstance) {
  const adminService = new AdminService(app.prisma);
  const userManagementService = new UserManagementService(app.prisma);

  // Alle Admin-Routes benötigen Auth + Admin-Rechte
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', adminMiddleware);

  // GET /api/admin/stats - System-Statistiken abrufen
  app.get('/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await adminService.getSystemStats();

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching admin stats:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch system statistics',
      });
    }
  });

  // === USER MANAGEMENT ===

  // GET /api/admin/users - Alle Benutzer abrufen
  app.get('/users', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const users = await userManagementService.getAllUsers();

      return reply.send({
        success: true,
        data: users,
      });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch users',
      });
    }
  });

  // GET /api/admin/users/:id - Einzelnen Benutzer abrufen
  app.get('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const user = await userManagementService.getUserById(id);

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'Benutzer nicht gefunden',
        });
      }

      return reply.send({
        success: true,
        data: user,
      });
    } catch (error: any) {
      console.error('Error fetching user:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch user',
      });
    }
  });

  // POST /api/admin/users - Neuen Benutzer erstellen
  app.post('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as CreateUserDto;

      // Validierung
      if (!data.email || !data.username || !data.password) {
        return reply.status(400).send({
          success: false,
          error: 'Email, Username und Passwort sind erforderlich',
        });
      }

      const user = await userManagementService.createUser(data);

      return reply.status(201).send({
        success: true,
        data: user,
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      return reply.status(400).send({
        success: false,
        error: error.message || 'Failed to create user',
      });
    }
  });

  // PUT /api/admin/users/:id - Benutzer aktualisieren
  app.put('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as UpdateUserDto;

      const user = await userManagementService.updateUser(id, data);

      return reply.send({
        success: true,
        data: user,
      });
    } catch (error: any) {
      console.error('Error updating user:', error);
      return reply.status(400).send({
        success: false,
        error: error.message || 'Failed to update user',
      });
    }
  });

  // DELETE /api/admin/users/:id - Benutzer löschen
  app.delete('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      await userManagementService.deleteUser(id);

      return reply.send({
        success: true,
        message: 'Benutzer erfolgreich gelöscht',
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      return reply.status(400).send({
        success: false,
        error: error.message || 'Failed to delete user',
      });
    }
  });

  // GET /api/admin/users/:id/stats - Benutzer-Statistiken abrufen
  app.get('/users/:id/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const stats = await userManagementService.getUserStats(id);

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching user stats:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch user statistics',
      });
    }
  });
}

export default adminRoutes;
