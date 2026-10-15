import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { CookieOptions, Response } from 'express';
import { env } from '../config/env.js';
import { RoleType } from '@digicatlog/shared';

export const AUTH_COOKIE_NAME = 'digicatlog_session';

export interface JwtPayload {
  userId: string;
  loginId: string;
  role: RoleType;
  shopId: string | null;
  mustChangePassword: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
  });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function getCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...getCookieOptions(),
    maxAge: 0,
  });
}
