import http from 'http';
import { app } from './app.js';
import { config } from './config.js';
import { initSocketIO } from './realtime/socket.js';
import { prisma } from './prisma.js';

const httpServer = http.createServer(app);

// Initialize Socket.io instance
initSocketIO(httpServer);

const server = httpServer.listen(config.port, () => {
  console.log(`🚀 LifeLink API Server running at http://localhost:${config.port}`);
  console.log(`📡 Socket.io server ready on port ${config.port}`);
  console.log(`🏥 Environment: ${config.nodeEnv}`);
});

// Graceful shutdown handling
const shutdown = async () => {
  console.log('Shutting down server gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('PostgreSQL client disconnected. Process exit.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// Reloaded with live Supabase database configuration

