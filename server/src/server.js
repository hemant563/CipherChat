import http from 'http';
import app from './app.js';
import connectDB, { disconnectDB } from './config/db.js';
import env, { validateEnv } from './config/env.js';
import logger from './utils/logger.js';
import { initSocket } from './socket/index.js';
import { initCronJobs } from './jobs/cronJobs.js';

// Validate environment variables before starting
validateEnv();

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Initialize background cron jobs
initCronJobs();

// Define start server function
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Reset all users' online status to offline on boot (fixes stale state after nodemon restarts)
    const { User } = await import('./models/index.js');
    await User.updateMany({ status: 'online' }, { $set: { status: 'offline', lastSeen: Date.now() } });

    // Start listening
    server.listen(env.PORT, () => {
      logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// ── Graceful Shutdown ─────────────────────────────────────────

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectDB();
    process.exit(0);
  });

  // Force close after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optional: Crash the process if needed
  // gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});
