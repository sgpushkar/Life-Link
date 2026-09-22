import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getClientSocket(): Socket {
  if (!socketInstance && typeof window !== 'undefined') {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const token = localStorage.getItem('lifelink_token') || '';

    socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Connected to LifeLink Realtime Socket Engine');
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Disconnected from Realtime Socket');
    });
  }

  return socketInstance!;
}
