import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.ts';
import { db, logAudit } from '../db/database.ts';

export type UserRole = 'senior' | 'caregiver' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  preferredLanguage: 'en' | 'hi' | 'mr';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: '24h' }
  );
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = header.slice(7).trim();
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as { sub: string; email: string; role: UserRole };
    const row = db
      .prepare('SELECT id, email, full_name, role, preferred_language, is_active FROM users WHERE id = ?')
      .get(decoded.sub) as
      | { id: string; email: string; full_name: string; role: UserRole; preferred_language: 'en' | 'hi' | 'mr'; is_active: number }
      | undefined;

    if (!row || !row.is_active) {
      res.status(401).json({ error: 'Account is inactive or no longer exists.' });
      return;
    }

    req.user = {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      preferredLanguage: row.preferred_language,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      logAudit({
        userId: req.user.id,
        action: 'ACCESS_DENIED',
        resource: req.originalUrl,
        status: 'denied',
        ipAddress: req.ip,
        details: `Role ${req.user.role} attempted access requiring ${allowedRoles.join(', ')}`,
      });
      res.status(403).json({ error: 'You do not have permission to access this resource.' });
      return;
    }
    next();
  };
}
