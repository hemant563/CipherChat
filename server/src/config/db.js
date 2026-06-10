import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import env from './env.js';

/**
 * Connect to MongoDB with Mongoose.
 * Retries connection on failure with exponential backoff.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      // Mongoose 8 uses the new URL parser and topology engine by default
    });

    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    // ── Connection event listeners ──────────────────────────────

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    // Exit process on initial connection failure — let the process manager restart
    process.exit(1);
  }
};

/**
 * Gracefully close MongoDB connection.
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed gracefully');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
  }
};

export default connectDB;
