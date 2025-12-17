import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BackupService } from '../services/backup.service';
import { SchedulerService } from '../services/scheduler.service';
import { adminMiddleware } from '../middleware/admin.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import * as fs from 'fs';

/**
 * Backup Routes (Admin only)
 */
export async function backupRoutes(app: FastifyInstance) {
  const backupService = new BackupService(app.prisma);
  const schedulerService = new SchedulerService(app.prisma, backupService);

  // Alle Routes benötigen Admin-Rechte
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', adminMiddleware);

  // GET /api/backups - Liste alle Backups
  app.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const backups = await backupService.listBackups();

      return reply.send({
        success: true,
        data: backups,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch backups',
      });
    }
  });

  // POST /api/backups - Erstelle neues Backup
  app.post('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const backup = await backupService.createBackup('MANUAL');

      return reply.status(201).send({
        success: true,
        data: backup,
        message: 'Backup created successfully',
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to create backup',
      });
    }
  });

  // GET /api/backups/:id/download - Download Backup
  app.get(
    '/:id/download',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        const backup = await app.prisma.backup.findUnique({
          where: { id },
        });

        if (!backup) {
          return reply.status(404).send({
            success: false,
            error: 'Backup not found',
          });
        }

        if (backup.status !== 'COMPLETED') {
          return reply.status(400).send({
            success: false,
            error: 'Backup is not completed yet',
          });
        }

        const filePath = backupService.getBackupPath(backup);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          return reply.status(404).send({
            success: false,
            error: 'Backup file not found on disk',
          });
        }

        // Send file
        return reply
          .type('application/gzip')
          .header('Content-Disposition', `attachment; filename="${backup.path}"`)
          .send(fs.createReadStream(filePath));
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to download backup',
        });
      }
    }
  );

  // DELETE /api/backups/:id - Lösche Backup
  app.delete(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        await backupService.deleteBackup(id);

        return reply.send({
          success: true,
          message: 'Backup deleted successfully',
        });
      } catch (error: any) {
        const statusCode = error.message === 'Backup not found' ? 404 : 500;
        return reply.status(statusCode).send({
          success: false,
          error: error.message || 'Failed to delete backup',
        });
      }
    }
  );

  // GET /api/backups/schedule - Hole aktuelle Scheduler-Konfiguration
  app.get('/schedule', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const schedule = await schedulerService.getSchedule();

      return reply.send({
        success: true,
        data: schedule || {
          enabled: false,
          cronSchedule: '0 2 * * *',
          provider: 'local',
          retention: 30,
          lastRun: null,
          nextRun: null,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch schedule',
      });
    }
  });

  // PUT /api/backups/schedule - Aktualisiere Scheduler-Konfiguration
  app.put(
    '/schedule',
    async (
      request: FastifyRequest<{
        Body: {
          enabled?: boolean;
          cronSchedule?: string;
          provider?: string;
          retention?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { enabled, cronSchedule, provider, retention } = request.body;

        // Validiere Cron-Expression
        if (cronSchedule && !schedulerService.validateCronExpression(cronSchedule)) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid cron expression',
          });
        }

        const schedule = await schedulerService.updateSchedule({
          enabled,
          cronSchedule,
          provider,
          retention,
        });

        return reply.send({
          success: true,
          data: schedule,
          message: 'Schedule updated successfully',
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to update schedule',
        });
      }
    }
  );

  // GET /api/backups/schedule/validate - Validiere Cron-Expression
  app.get(
    '/schedule/validate',
    async (
      request: FastifyRequest<{ Querystring: { expression: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { expression } = request.query;

        if (!expression) {
          return reply.status(400).send({
            success: false,
            error: 'Expression parameter required',
          });
        }

        const isValid = schedulerService.validateCronExpression(expression);
        const description = isValid
          ? schedulerService.describeCronExpression(expression)
          : null;

        return reply.send({
          success: true,
          data: {
            valid: isValid,
            expression,
            description,
          },
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to validate expression',
        });
      }
    }
  );
}
