import app from './app';
import { config, validateConfig } from './config/env';
import { pool, connectMongoDB, redis, closeConnections } from './config/database';
import logger from './utils/logger';

const PORT = config.PORT || 3000;

// Validate environment configuration
try {
  validateConfig();
} catch (error) {
  logger.error(`Configuration error: ${error.message}`);
  process.exit(1);
}

// Start server
const startServer = async () => {
  try {
    // Test database connections
    logger.info('Testing database connections...');

    // Test PostgreSQL
    await pool.query('SELECT NOW()');
    logger.info('✅ PostgreSQL connected');

    // Connect to MongoDB
    await connectMongoDB();
    logger.info('✅ MongoDB connected');

    // Test Redis
    if (redis) {
      await redis.ping();
      logger.info('✅ Redis connected');
    }

    // Start Express server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info('========================================');
      logger.info(`🚀 AI Underwriting System`);
      logger.info(`📍 Environment: ${config.NODE_ENV}`);
      logger.info(`🌐 Server running on port ${PORT}`);
      logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      logger.info(`❤️  Health Check: http://localhost:${PORT}/health`);
      logger.info('========================================');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database connections
          await closeConnections();
          logger.info('✅ All connections closed gracefully');
          process.exit(0);
        } catch (error) {
          logger.error(`Error during shutdown: ${error.message}`);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Start the server
startServer();
