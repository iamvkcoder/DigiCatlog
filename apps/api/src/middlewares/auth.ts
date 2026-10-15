import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AUTH_COOKIE_NAME, verifyToken } from '../lib/auth.js';
import { RoleType, Role } from '@digicatlog/shared';

export interface AuthenticatedUser {
  id: string;
  loginId: string;
  role: RoleType;
  shopId: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      shopId?: string;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token =
    req.cookies?.[AUTH_COOKIE_NAME] ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      loginId: true,
      role: true,
      shopId: true,
      mustChangePassword: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    res.status(401).json({ error: 'User account not found or suspended.' });
    return;
  }

  req.user = user as AuthenticatedUser;
  next();
}

export function requireRole(...roles: RoleType[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
      return;
    }

    next();
  };
}

/**
 * STRICT MULTI-TENANT RULE:
 * The shopId for every shop-scoped query comes ONLY from the authenticated session,
 * NEVER from client input.
 * Strips any shopId sent by client in body, params, or query to prevent manipulation.
 */
export function requireTenantShop(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (req.user.role !== Role.SHOP_OWNER || !req.user.shopId) {
    res.status(403).json({ error: 'Forbidden: Tenant shop access required.' });
    return;
  }

  // Bind tenant shopId exclusively from authenticated session
  req.shopId = req.user.shopId;

  // Defensive sanitization: delete any client-injected shopId
  if (req.body && typeof req.body === 'object') {
    delete req.body.shopId;
  }
  if (req.query && typeof req.query === 'object') {
    delete (req.query as Record<string, unknown>).shopId;
  }

  next();
}

export function requirePasswordChanged(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.mustChangePassword) {
    res.status(403).json({
      error: 'Password change required before accessing this resource.',
      code: 'MUST_CHANGE_PASSWORD',
    });
    return;
  }

  next();
}
