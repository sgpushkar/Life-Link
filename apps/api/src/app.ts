import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { prisma } from './prisma.js';
import { authRouter } from './modules/auth/router.js';
import { facilitiesRouter } from './modules/facilities/router.js';
import { inventoryRouter } from './modules/inventory/router.js';
import { searchRouter } from './modules/search/router.js';
import { requestsRouter } from './modules/requests/router.js';
import { adminRouter } from './modules/admin/router.js';
import { bloodRouter } from './modules/blood/router.js';
import { donorsRouter } from './modules/donors/router.js';
import { logisticsRouter } from './modules/logistics/router.js';
import { analyticsRouter } from './modules/analytics/router.js';
import { smsRouter } from './modules/sms/router.js';
import { syncRouter } from './modules/sync/router.js';

export const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from frontend and local tools
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true); // Dev permissive
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'production' ? 500 : 50000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', generalLimiter);

// Health Check
app.get('/api/v1/health', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (e: any) {
    dbStatus = `error: ${e.message}`;
  }

  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    version: '1.0.0',
    mode: config.nodeEnv,
  });
});

// Mount Module Routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/facilities', facilitiesRouter);
app.use('/api/v1', inventoryRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/requests', requestsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/blood', bloodRouter);
app.use('/api/v1/donors', donorsRouter);
app.use('/api/v1/logistics', logisticsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/sms', smsRouter);
app.use('/api/v1/ussd', (req, res, next) => smsRouter(req, res, next));
app.use('/api/v1/sync', syncRouter);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  return res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred',
      details: config.nodeEnv === 'development' ? err.stack : undefined,
    },
  });
});
