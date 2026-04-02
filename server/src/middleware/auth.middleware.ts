import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../services/auth.service.js';
import { ApiResponse } from '@synthetic-monitoring/shared';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authenticate JWT token middleware
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  // Attach user to request
  req.user = payload;
  next();
}

/**
 * Require specific role(s) middleware
 * Usage: requireRoles('ADMIN', 'SUPER_ADMIN')
 */
export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

/**
 * Require admin role middleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
  if (!adminRoles.includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.',
    });
    return;
  }

  next();
}

/**
 * Optional authentication - attaches user if valid token present
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}
