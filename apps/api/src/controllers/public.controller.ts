import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { menuCache } from '../lib/cache.js';
import { ShopStatus, PublicMenuResponse, OpeningHours } from '@digicatlog/shared';

function checkIsOpenNow(openingHours?: OpeningHours | null): boolean {
  if (!openingHours) return true;

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const currentDayName = days[now.getDay()];
  const daySchedule = openingHours[currentDayName];

  if (!daySchedule || daySchedule.isClosed) return false;

  const currentHours = now.getHours().toString().padStart(2, '0');
  const currentMins = now.getMinutes().toString().padStart(2, '0');
  const currentTime = `${currentHours}:${currentMins}`;

  return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
}

export async function getPublicMenu(req: Request, res: Response): Promise<void> {
  const slug = req.params.slug as string;

  if (!slug) {
    res.status(400).json({ error: 'Shop slug is required.' });
    return;
  }

  const cacheKey = `menu:${slug}`;
  const cached = menuCache.get<PublicMenuResponse>(cacheKey);

  if (cached) {
    res.setHeader(
      'Cache-Control',
      process.env.NODE_ENV === 'production'
        ? 'public, max-age=30, must-revalidate'
        : 'no-cache'
    );
    res.setHeader('X-Cache', 'HIT');
    res.json(cached);
    return;
  }

  const shop = await prisma.shop.findUnique({
    where: { slug },
    include: {
      settings: true,
      categories: {
        where: { isVisible: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  if (!shop) {
    res.status(404).json({
      error: 'Menu not found. The shop does not exist or has been removed.',
      code: 'NOT_FOUND',
    });
    return;
  }

  if (shop.status === ShopStatus.SUSPENDED) {
    res.status(403).json({
      error: 'This menu is currently unavailable. Please contact the restaurant.',
      code: 'SHOP_SUSPENDED',
      shopName: shop.name,
    });
    return;
  }

  if (shop.expiresAt && shop.expiresAt < new Date()) {
    res.status(403).json({
      error: 'This menu subscription has expired. Please contact the restaurant.',
      code: 'SHOP_EXPIRED',
      shopName: shop.name,
    });
    return;
  }

  const settings = shop.settings;
  const hours = settings?.openingHours as OpeningHours | null;
  const isOpenNow = checkIsOpenNow(hours);

  const responsePayload: PublicMenuResponse = {
    shop: {
      name: shop.name,
      slug: shop.slug,
      status: shop.status as any,
      logoUrl: settings?.logoUrl || null,
      coverUrl: settings?.coverUrl || null,
      brandColor: settings?.brandColor || '#8B4513',
      templateKey: (settings?.templateKey as any) || 'classic-cream',
      phone: settings?.phone || null,
      whatsapp: settings?.whatsapp || null,
      address: settings?.address || null,
      mapsUrl: settings?.mapsUrl || null,
      openingHours: hours,
      socialLinks: (settings?.socialLinks as any) || null,
      currency: settings?.currency || 'USD',
      isOpenNow,
    },
    categories: shop.categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      sortOrder: cat.sortOrder,
      items: cat.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        imageUrl: item.imageUrl,
        isVeg: item.isVeg,
        spiceLevel: item.spiceLevel,
        tags: item.tags,
        isAvailable: item.isAvailable,
        sortOrder: item.sortOrder,
      })),
    })),
  };

  menuCache.set(cacheKey, responsePayload, 600); // 10 minutes cache

  res.setHeader(
    'Cache-Control',
    process.env.NODE_ENV === 'production'
      ? 'public, max-age=30, must-revalidate'
      : 'no-cache'
  );
  res.setHeader('X-Cache', 'MISS');
  res.json(responsePayload);
}

export async function recordScan(req: Request, res: Response): Promise<void> {
  const slug = req.params.slug as string;

  const shop = await prisma.shop.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });

  if (!shop || shop.status !== ShopStatus.ACTIVE) {
    res.status(404).json({ error: 'Shop not found or inactive.' });
    return;
  }

  // Privacy-friendly UA hash with daily date salt to prevent tracking individuals
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const dateStr = new Date().toISOString().slice(0, 10);
  const uaHash = crypto
    .createHash('sha256')
    .update(`${userAgent}-${ip}-${dateStr}`)
    .digest('hex')
    .slice(0, 16);

  // Avoid duplicate scans from same device within 6 hours
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const recentScan = await prisma.qrScan.findFirst({
    where: {
      shopId: shop.id,
      uaHash,
      scannedAt: { gte: sixHoursAgo },
    },
  });

  if (!recentScan) {
    await prisma.qrScan.create({
      data: {
        shopId: shop.id,
        uaHash,
      },
    });
  }

  res.json({ recorded: true });
}
