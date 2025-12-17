import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/error.middleware';
import { initializeProviders } from './plugins/initializeProviders';
import path from 'path';

/**
 * Fastify App erstellen und konfigurieren
 */
export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // Prisma Client initialisieren
  const prisma = new PrismaClient();

  // Provider-System initialisieren
  const registry = initializeProviders(prisma);

  // Prisma und Registry als Decorator hinzufügen
  app.decorate('prisma', prisma);
  app.decorate('registry', registry);

  // CORS
  const corsOrigin = process.env.CORS_ORIGIN;

  if (!corsOrigin && process.env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN must be set in production environment');
  }

  await app.register(cors, {
    origin: corsOrigin || 'http://localhost:5173', // Development fallback
    credentials: true,
  });

  // Rate Limiting
  await app.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: parseInt(process.env.RATE_LIMIT_TIMEWINDOW || '60000'),
  });

  // Multipart/Form-Data für File Uploads
  await app.register(multipart, {
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
    },
  });

  // Static Files (Uploads)
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
  await app.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
  });

  // Error Handler
  app.setErrorHandler(errorHandler);

  // Health Check
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // API Routes (werden später hinzugefügt)
  app.get('/api', async () => {
    return {
      name: 'Noter API',
      version: '1.0.0',
      providers: registry.getProviderStatus(),
    };
  });

  // Routes registrieren
  const { setupRoutes } = await import('./routes/setup');
  const { authRoutes } = await import('./routes/auth');
  const { noteRoutes } = await import('./routes/notes');
  const { folderRoutes } = await import('./routes/folders');
  const { shareRoutes } = await import('./routes/shares');
  const { tagRoutes } = await import('./routes/tags');
  const { attachmentRoutes } = await import('./routes/attachments');
  const importRoutes = await import('./routes/import');
  const adminRoutes = await import('./routes/admin');
  const { backupRoutes } = await import('./routes/backup');

  await app.register(setupRoutes, { prefix: '/api/setup' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(noteRoutes, { prefix: '/api/notes' });
  await app.register(folderRoutes, { prefix: '/api/folders' });
  await app.register(shareRoutes, { prefix: '/api/shares' });
  await app.register(tagRoutes, { prefix: '/api/tags' });
  await app.register(attachmentRoutes, { prefix: '/api' });
  await app.register(importRoutes.default, { prefix: '/api/import' });
  await app.register(adminRoutes.default, { prefix: '/api/admin' });
  await app.register(backupRoutes, { prefix: '/api/backups' });

  // Backup Scheduler starten
  const { BackupService } = await import('./services/backup.service');
  const { SchedulerService } = await import('./services/scheduler.service');
  const backupService = new BackupService(prisma);
  const schedulerService = new SchedulerService(prisma, backupService);

  // Scheduler beim App-Start initialisieren
  await schedulerService.start();

  // Graceful Shutdown: Scheduler stoppen
  app.addHook('onClose', async () => {
    schedulerService.stop();
  });

  return app;
}

// TypeScript Decorators erweitern
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    registry: ReturnType<typeof initializeProviders>;
  }
}
