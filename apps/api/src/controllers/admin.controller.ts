import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/auth.js';
import { menuCache } from '../lib/cache.js';
import {
  CreateShopInput,
  UpdateShopInput,
  ResetPasswordInput,
  Role,
  ShopStatus,
} from '@digicatlog/shared';

function generateTemporaryPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
  let password = '';
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    password += chars[bytes[i] % chars.length];
  }
  // Guarantee at least 1 uppercase, 1 lowercase, 1 number, 1 special char
  return password + 'A1!';
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function getStats(_req: Request, res: Response): Promise<void> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [totalShops, activeShops, suspendedShops, expiringIn7Days] = await Promise.all([
    prisma.shop.count(),
    prisma.shop.count({ where: { status: ShopStatus.ACTIVE } }),
    prisma.shop.count({ where: { status: ShopStatus.SUSPENDED } }),
    prisma.shop.count({
      where: {
        expiresAt: {
          gte: now,
          lte: in7Days,
        },
      },
    }),
  ]);

  res.json({
    totalShops,
    activeShops,
    suspendedShops,
    expiringIn7Days,
  });
}

export async function getShops(req: Request, res: Response): Promise<void> {
  const { search, status } = req.query as { search?: string; status?: string };

  const where: any = {};

  if (status && (status === ShopStatus.ACTIVE || status === ShopStatus.SUSPENDED)) {
    where.status = status;
  }

  if (search && search.trim() !== '') {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { slug: { contains: term, mode: 'insensitive' } },
      { users: { some: { loginId: { contains: term, mode: 'insensitive' } } } },
    ];
  }

  const shops = await prisma.shop.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      users: {
        where: { role: Role.SHOP_OWNER },
        select: {
          id: true,
          loginId: true,
          isActive: true,
          mustChangePassword: true,
          lastLoginAt: true,
        },
      },
      _count: {
        select: {
          categories: true,
          items: true,
          qrScans: true,
        },
      },
    },
  });

  const formatted = shops.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    status: s.status,
    expiresAt: s.expiresAt,
    createdAt: s.createdAt,
    ownerLoginId: s.users[0]?.loginId || null,
    ownerUserId: s.users[0]?.id || null,
    ownerMustChangePassword: s.users[0]?.mustChangePassword ?? false,
    categoryCount: s._count.categories,
    itemCount: s._count.items,
    scanCount: s._count.qrScans,
  }));

  res.json({ shops: formatted });
}

export async function createShop(req: Request, res: Response): Promise<void> {
  const { name, slug: customSlug, loginId: customLoginId, expiresAt } =
    req.body as CreateShopInput;

  // Auto-generate slug if not provided or format custom slug
  let slug = customSlug ? slugify(customSlug) : slugify(name);
  if (!slug) slug = 'shop-' + crypto.randomBytes(3).toString('hex');

  // Verify unique slug
  let existingShop = await prisma.shop.findUnique({ where: { slug } });
  if (existingShop) {
    if (customSlug) {
      res.status(400).json({ error: `The slug "${slug}" is already taken.` });
      return;
    }
    slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
  }

  // Generate unique loginId
  let loginId = customLoginId?.trim() || `${slug.replace(/-/g, '_')}_owner`;
  let existingUser = await prisma.user.findUnique({ where: { loginId } });
  if (existingUser) {
    loginId = `${loginId}_${crypto.randomBytes(2).toString('hex')}`;
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const defaultHours = {
    monday: { open: '09:00', close: '22:00', isClosed: false },
    tuesday: { open: '09:00', close: '22:00', isClosed: false },
    wednesday: { open: '09:00', close: '22:00', isClosed: false },
    thursday: { open: '09:00', close: '22:00', isClosed: false },
    friday: { open: '09:00', close: '23:00', isClosed: false },
    saturday: { open: '10:00', close: '23:00', isClosed: false },
    sunday: { open: '10:00', close: '21:00', isClosed: false },
  };

  const shop = await prisma.shop.create({
    data: {
      name,
      slug,
      status: ShopStatus.ACTIVE,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      settings: {
        create: {
          brandColor: '#8B4513',
          templateKey: 'classic-cream',
          currency: 'USD',
          openingHours: defaultHours,
        },
      },
      users: {
        create: {
          loginId,
          passwordHash,
          role: Role.SHOP_OWNER,
          mustChangePassword: true,
          isActive: true,
        },
      },
    },
    include: {
      users: true,
    },
  });

  // Record audit log
  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      shopId: shop.id,
      action: 'SHOP_CREATED',
      meta: { name: shop.name, slug: shop.slug, ownerLoginId: loginId },
    },
  });

  res.status(201).json({
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      status: shop.status,
      expiresAt: shop.expiresAt,
      createdAt: shop.createdAt,
    },
    credentials: {
      loginId,
      temporaryPassword,
    },
  });
}

export async function updateShop(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { name, slug: newSlug, status, expiresAt } = req.body as UpdateShopInput;

  const shop = await prisma.shop.findUnique({ where: { id } });
  if (!shop) {
    res.status(404).json({ error: 'Shop not found.' });
    return;
  }

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (status !== undefined) data.status = status;
  if (expiresAt !== undefined) {
    data.expiresAt = expiresAt ? new Date(expiresAt) : null;
  }

  if (newSlug && newSlug !== shop.slug) {
    const slug = slugify(newSlug);
    const existing = await prisma.shop.findUnique({ where: { slug } });
    if (existing && existing.id !== id) {
      res.status(400).json({ error: `The slug "${slug}" is already in use.` });
      return;
    }
    data.slug = slug;
  }

  const updated = await prisma.shop.update({
    where: { id },
    data,
  });

  // Invalidate menu cache
  menuCache.invalidateShop(shop.slug);
  if (updated.slug !== shop.slug) {
    menuCache.invalidateShop(updated.slug);
  }

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      shopId: updated.id,
      action: 'SHOP_UPDATED',
      meta: data,
    },
  });

  res.json({ shop: updated });
}

export async function resetShopPassword(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { newPassword: customPassword } = (req.body || {}) as ResetPasswordInput;

  const shop = await prisma.shop.findUnique({
    where: { id },
    include: {
      users: {
        where: { role: Role.SHOP_OWNER },
      },
    },
  });

  if (!shop) {
    res.status(404).json({ error: 'Shop not found.' });
    return;
  }

  const owner = shop.users[0];
  if (!owner) {
    res.status(404).json({ error: 'Shop owner account not found for this shop.' });
    return;
  }

  const temporaryPassword = customPassword || generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await prisma.user.update({
    where: { id: owner.id },
    data: {
      passwordHash,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockoutUntil: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      shopId: shop.id,
      action: 'PASSWORD_RESET_BY_ADMIN',
      meta: { ownerLoginId: owner.loginId },
    },
  });

  res.json({
    success: true,
    message: 'Temporary password generated.',
    credentials: {
      loginId: owner.loginId,
      temporaryPassword,
    },
  });
}

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const { search, limit = '100' } = req.query as { search?: string; limit?: string };

  const take = Math.min(parseInt(limit, 10) || 100, 200);

  const where: any = {};
  if (search && search.trim() !== '') {
    const term = search.trim();
    where.OR = [
      { action: { contains: term, mode: 'insensitive' } },
      { actor: { loginId: { contains: term, mode: 'insensitive' } } },
      { shop: { name: { contains: term, mode: 'insensitive' } } },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      actor: { select: { loginId: true } },
      shop: { select: { name: true, slug: true } },
    },
  });

  const formatted = logs.map((log) => ({
    id: log.id,
    actorId: log.actorId,
    actorLoginId: log.actor?.loginId || 'Unknown',
    shopId: log.shopId,
    shopName: log.shop?.name || null,
    action: log.action,
    meta: log.meta,
    createdAt: log.createdAt,
  }));

  res.json({ logs: formatted });
}
