import dotenv from 'dotenv';
import { createApp } from './app';

// Environment-Variablen laden
dotenv.config();

/**
 * Server starten
 */
async function start() {
  try {
    const app = await createApp();

    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });

    console.log('');
    console.log('🚀 Noter Backend is running!');
    console.log(`📍 Server: http://${host}:${port}`);
    console.log(`🏥 Health: http://${host}:${port}/health`);
    console.log(`📡 API: http://${host}:${port}/api`);
    console.log('');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹ Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹ Shutting down gracefully...');
  process.exit(0);
});

// Server starten
start();
