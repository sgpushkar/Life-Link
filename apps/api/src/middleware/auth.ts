import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { config } from '../config.js';

export interface AuthUser {
  userId: string;
  phone: string;
  name: string;
  role: UserRole;
  facilityId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function verifyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.lifelink_access_token) {
    token = req.cookies.lifelink_access_token;
  }

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is missing',
      },
    });
  }

  try {
    const payload = jwt.verify(token, config.jwtAccessSecret) as any;
    req.user = {
      userId: payload.userId,
      phone: payload.phone,
      name: payload.name,
      role: payload.role as UserRole,
      facilityId: payload.facilityId || null,
    };
    return next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Session has expired or is invalid. Please log in again.',
      },
    });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.lifelink_access_token) {
    token = req.cookies.lifelink_access_token;
  }

  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtAccessSecret) as any;
      req.user = {
        userId: payload.userId,
        phone: payload.phone,
        name: payload.name,
        role: payload.role as UserRole,
        facilityId: payload.facilityId || null,
      };
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Role '${req.user.role}' is not authorized for this operation.`,
        },
      });
    }

    next();
  };
}
