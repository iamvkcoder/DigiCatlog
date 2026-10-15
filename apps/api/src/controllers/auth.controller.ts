import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  hashPassword,
  verifyPassword,
  signToken,
  setAuthCookie,
  clearAuthCookie,
} from '../lib/auth.js';
import { LoginInput, ChangePasswordInput, Role, ShopStatus } from '@digicatlog/shared';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function login(req: Request, res: Response): Promise<void> {
  const { loginId, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({
    where: { loginId },
    include: {
      shop: true,
    },
  });

  const genericError = 'Invalid login ID or password.';

  if (!user || !user.isActive) {
    res.status(401).json({ error: genericError });
    return;
  }

  // Check lockout
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / (60 * 1000));
    res.status(429).json({
      error: `Account is temporarily locked due to repeated failed attempts. Please try again in ${minutesLeft} minute(s).`,
    });
    return;
  }

  const isPasswordValid = await verifyPassword(user.passwordHash, password);

  if (!isPasswordValid) {
    const failedAttempts = user.failedLoginAttempts + 1;
    const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
    const lockoutUntil = shouldLock
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
      : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: failedAttempts,
        lockoutUntil,
      },
    });

    if (shouldLock) {
      res.status(429).json({
        error: `Account locked for ${LOCKOUT_MINUTES} minutes due to too many failed attempts.`,
      });
      return;
    }

    res.status(401).json({ error: genericError });
    return;
  }

  // Check if shop is suspended (for shop owners)
  if (user.role === Role.SHOP_OWNER && user.shop) {
    if (user.shop.status === ShopStatus.SUSPENDED) {
      res.status(403).json({
        error: 'Your shop has been suspended by the administrator. Please contact support.',
      });
      return;
    }
  }

  // Reset failed login attempts and update last login time
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date(),
    },
  });

  const token = signToken({
    userId: user.id,
    loginId: user.loginId,
    role: user.role as any,
    shopId: user.shopId,
    mustChangePassword: user.mustChangePassword,
  });

  setAuthCookie(res, token);

  res.json({
    user: {
      id: user.id,
      loginId: user.loginId,
      role: user.role,
      shopId: user.shopId,
      mustChangePassword: user.mustChangePassword,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    },
    shop: user.shop
      ? {
          id: user.shop.id,
          name: user.shop.name,
          slug: user.shop.slug,
          status: user.shop.status,
          expiresAt: user.shop.expiresAt,
        }
      : null,
  });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out successfully.' });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      loginId: true,
      role: true,
      shopId: true,
      mustChangePassword: true,
      isActive: true,
      lastLoginAt: true,
      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!user) {
    res.status(401).json({ error: 'User not found.' });
    return;
  }

  res.json({ user, shop: user.shop });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const { currentPassword, newPassword } = req.body as ChangePasswordInput;

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const isCurrentValid = await verifyPassword(user.passwordHash, currentPassword);
  if (!isCurrentValid) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }

  const newHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
    },
  });

  // Re-sign token with mustChangePassword = false
  const token = signToken({
    userId: user.id,
    loginId: user.loginId,
    role: user.role as any,
    shopId: user.shopId,
    mustChangePassword: false,
  });

  setAuthCookie(res, token);

  // Record audit log
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      shopId: user.shopId,
      action: 'PASSWORD_CHANGED',
      meta: { forced: user.mustChangePassword },
    },
  });

  res.json({
    success: true,
    message: 'Password changed successfully.',
  });
}
