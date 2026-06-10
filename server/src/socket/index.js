import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { User } from '../models/index.js';
import logger from '../utils/logger.js';
import chatHandler from './chatHandler.js';
import callHandler from './callHandler.js';
import presenceHandler from './presenceHandler.js';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(',').map(o => o.trim()),
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select('+isVerified');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Connection Handler
  io.on('connection', async (socket) => {
    logger.info(`User connected via socket: ${socket.user.username} (${socket.id})`);

    // Join a personal room for direct messages
    socket.join(socket.user._id.toString());
    
    // Join all group rooms the user is a member of
    try {
      const Group = (await import('../models/Group.js')).default;
      const userGroups = await Group.find({ 'members.user': socket.user._id }).select('_id');
      userGroups.forEach(group => {
        socket.join(group._id.toString());
      });
    } catch (err) {
      logger.error('Error joining group rooms:', err);
    }

    // Initialize handlers
    presenceHandler(io, socket);
    chatHandler(io, socket);
    callHandler(io, socket);

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user.username} (${socket.id})`);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
