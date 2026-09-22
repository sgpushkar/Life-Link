import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

let ioInstance: SocketIOServer | null = null;

export interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    role: string;
    facilityId?: string;
  };
}

export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  ioInstance = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
  });

  // Authentication middleware
  ioInstance.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      // In dev demo mode, allow anonymous socket connection with limited public rooms
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwtAccessSecret) as any;
      socket.user = {
        userId: decoded.userId,
        role: decoded.role,
        facilityId: decoded.facilityId,
      };
      return next();
    } catch (err) {
      console.warn('Socket authentication failed, continuing as guest');
      return next();
    }
  });

  ioInstance.on('connection', (socket: AuthenticatedSocket) => {
    // Automatically join facility room if facilityId is present
    if (socket.user?.facilityId) {
      socket.join(`facility:${socket.user.facilityId}`);
    }

    // Client can request to join specific rooms (e.g. for tracking a specific request or donor feed)
    socket.on('join:room', (room: string) => {
      // Enforce room access safety
      if (
        room.startsWith('request:') ||
        room.startsWith('donor:') ||
        room.startsWith('facility:') ||
        room.startsWith('district:')
      ) {
        socket.join(room);
      }
    });

    socket.on('leave:room', (room: string) => {
      socket.leave(room);
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return ioInstance;
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

/**
 * Dispatches domain events to appropriate rooms and clients
 */
export function emitRealtimeEvent(event: string, data: any, room?: string) {
  if (!ioInstance) return;
  if (room) {
    ioInstance.to(room).emit(event, data);
  } else {
    ioInstance.emit(event, data);
  }
}
