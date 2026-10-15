import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { ShopStatus } from '@prisma/client';

describe('Public Digital Menu & QR Scan API Tests', () => {
  let activeShop: any;
  let suspendedShop: any;
  let expiredShop: any;

  beforeAll(async () => {
    // Active Shop
    activeShop = await prisma.shop.create({
      data: {
        name: 'Public Bistro',
        slug: 'public-bistro-' + Date.now(),
        status: ShopStatus.ACTIVE,
        settings: {
          create: {
            brandColor: '#8B4513',
            templateKey: 'classic-cream',
            openingHours: {
              monday: { open: '00:00', close: '23:59', isClosed: false },
              tuesday: { open: '00:00', close: '23:59', isClosed: false },
              wednesday: { open: '00:00', close: '23:59', isClosed: false },
              thursday: { open: '00:00', close: '23:59', isClosed: false },
              friday: { open: '00:00', close: '23:59', isClosed: false },
              saturday: { open: '00:00', close: '23:59', isClosed: false },
              sunday: { open: '00:00', close: '23:59', isClosed: false },
            },
          },
        },
      },
    });

    const cat = await prisma.category.create({
      data: {
        shopId: activeShop.id,
        name: 'Starters',
        isVisible: true,
        sortOrder: 0,
      },
    });

    await prisma.item.create({
      data: {
        shopId: activeShop.id,
        categoryId: cat.id,
        name: 'Garlic Bread',
        price: 5.0,
        isVeg: true,
        isAvailable: true,
      },
    });

    // Suspended Shop
    suspendedShop = await prisma.shop.create({
      data: {
        name: 'Suspended Cafe',
        slug: 'suspended-cafe-' + Date.now(),
        status: ShopStatus.SUSPENDED,
        settings: { create: { templateKey: 'modern-dark' } },
      },
    });

    // Expired Shop
    expiredShop = await prisma.shop.create({
      data: {
        name: 'Expired Diner',
        slug: 'expired-diner-' + Date.now(),
        status: ShopStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired yesterday
        settings: { create: { templateKey: 'minimal-white' } },
      },
    });
  });

  it('serves active public menu with categories, items, and isOpenNow: true', async () => {
    const res = await request(app).get(`/api/public/menu/${activeShop.slug}`);

    expect(res.status).toBe(200);
    expect(res.body.shop.name).toBe('Public Bistro');
    expect(res.body.shop.isOpenNow).toBe(true);
    expect(res.body.categories.length).toBe(1);
    expect(res.body.categories[0].items[0].name).toBe('Garlic Bread');
    expect(res.headers['cache-control']).toBeDefined();
    expect(res.headers['x-cache']).toBe('MISS');

    // Subsequent request must hit in-memory cache
    const cacheRes = await request(app).get(`/api/public/menu/${activeShop.slug}`);
    expect(cacheRes.status).toBe(200);
    expect(cacheRes.headers['x-cache']).toBe('HIT');
  });

  it('returns 403 SHOP_SUSPENDED for suspended shop', async () => {
    const res = await request(app).get(`/api/public/menu/${suspendedShop.slug}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SHOP_SUSPENDED');
  });

  it('returns 403 SHOP_EXPIRED for expired shop', async () => {
    const res = await request(app).get(`/api/public/menu/${expiredShop.slug}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SHOP_EXPIRED');
  });

  it('returns 404 NOT_FOUND for non-existent shop slug', async () => {
    const res = await request(app).get('/api/public/menu/non-existent-slug-xyz');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('records QR scan and deduplicates repeated scans from same client', async () => {
    const scanRes = await request(app)
      .post(`/api/public/menu/${activeShop.slug}/scan`)
      .set('User-Agent', 'TestBot/1.0');

    expect(scanRes.status).toBe(200);
    expect(scanRes.body.recorded).toBe(true);

    // Count scans in database
    const count1 = await prisma.qrScan.count({ where: { shopId: activeShop.id } });
    expect(count1).toBe(1);

    // Second scan from same client within 6 hours
    await request(app)
      .post(`/api/public/menu/${activeShop.slug}/scan`)
      .set('User-Agent', 'TestBot/1.0');

    const count2 = await prisma.qrScan.count({ where: { shopId: activeShop.id } });
    // Count should still be 1 due to session deduplication
    expect(count2).toBe(1);
  });
});
