import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/auth.js';
import { Role, ShopStatus } from '@prisma/client';

describe('Strict Tenant Isolation Verification', () => {
  let shopA: any;
  let shopB: any;
  let cookieA: string[];
  let cookieB: string[];
  let catA: any;
  let catB: any;
  let itemA: any;
  let itemB: any;

  beforeAll(async () => {
    const passwordHash = await hashPassword('TenantPass123!');

    // Create Shop A
    shopA = await prisma.shop.create({
      data: {
        name: 'Tenant Shop A',
        slug: 'tenant-shop-a-' + Date.now(),
        status: ShopStatus.ACTIVE,
        settings: { create: { templateKey: 'classic-cream' } },
        users: {
          create: {
            loginId: 'owner_a_' + Date.now(),
            passwordHash,
            role: Role.SHOP_OWNER,
            mustChangePassword: false,
          },
        },
      },
      include: { users: true },
    });

    // Create Shop B
    shopB = await prisma.shop.create({
      data: {
        name: 'Tenant Shop B',
        slug: 'tenant-shop-b-' + Date.now(),
        status: ShopStatus.ACTIVE,
        settings: { create: { templateKey: 'modern-dark' } },
        users: {
          create: {
            loginId: 'owner_b_' + Date.now(),
            passwordHash,
            role: Role.SHOP_OWNER,
            mustChangePassword: false,
          },
        },
      },
      include: { users: true },
    });

    // Create Category & Item for Shop A
    catA = await prisma.category.create({
      data: { shopId: shopA.id, name: 'Shop A Drinks', sortOrder: 0 },
    });
    itemA = await prisma.item.create({
      data: {
        shopId: shopA.id,
        categoryId: catA.id,
        name: 'Shop A Green Tea',
        price: 4.5,
      },
    });

    // Create Category & Item for Shop B
    catB = await prisma.category.create({
      data: { shopId: shopB.id, name: 'Shop B Desserts', sortOrder: 0 },
    });
    itemB = await prisma.item.create({
      data: {
        shopId: shopB.id,
        categoryId: catB.id,
        name: 'Shop B Cheesecake',
        price: 7.0,
      },
    });

    // Log in Shop A
    const loginResA = await request(app)
      .post('/api/auth/login')
      .send({ loginId: shopA.users[0].loginId, password: 'TenantPass123!' });
    cookieA = loginResA.headers['set-cookie'];

    // Log in Shop B
    const loginResB = await request(app)
      .post('/api/auth/login')
      .send({ loginId: shopB.users[0].loginId, password: 'TenantPass123!' });
    cookieB = loginResB.headers['set-cookie'];
  });

  it('Shop A can only fetch its own categories, never Shop B categories', async () => {
    const res = await request(app)
      .get('/api/dashboard/categories')
      .set('Cookie', cookieA);

    expect(res.status).toBe(200);
    const names = res.body.categories.map((c: any) => c.name);
    expect(names).toContain('Shop A Drinks');
    expect(names).not.toContain('Shop B Desserts');
  });

  it('Shop A can only fetch its own items, never Shop B items', async () => {
    const res = await request(app)
      .get('/api/dashboard/items')
      .set('Cookie', cookieA);

    expect(res.status).toBe(200);
    const names = res.body.items.map((i: any) => i.name);
    expect(names).toContain('Shop A Green Tea');
    expect(names).not.toContain('Shop B Cheesecake');
  });

  it('Shop A CANNOT edit Shop B category', async () => {
    const res = await request(app)
      .put(`/api/dashboard/categories/${catB.id}`)
      .set('Cookie', cookieA)
      .send({ name: 'Hacked Category' });

    expect(res.status).toBe(404);

    // Verify DB was unaffected
    const dbCatB = await prisma.category.findUnique({ where: { id: catB.id } });
    expect(dbCatB?.name).toBe('Shop B Desserts');
  });

  it('Shop A CANNOT delete Shop B category', async () => {
    const res = await request(app)
      .delete(`/api/dashboard/categories/${catB.id}`)
      .set('Cookie', cookieA);

    expect(res.status).toBe(404);

    const dbCatB = await prisma.category.findUnique({ where: { id: catB.id } });
    expect(dbCatB).not.toBeNull();
  });

  it('Shop A CANNOT edit Shop B item', async () => {
    const res = await request(app)
      .put(`/api/dashboard/items/${itemB.id}`)
      .set('Cookie', cookieA)
      .send({ name: 'Hacked Item Price', price: 0.01 });

    expect(res.status).toBe(404);

    const dbItemB = await prisma.item.findUnique({ where: { id: itemB.id } });
    expect(Number(dbItemB?.price)).toBe(7.0);
  });

  it('Shop A CANNOT toggle availability of Shop B item', async () => {
    const res = await request(app)
      .patch(`/api/dashboard/items/${itemB.id}/availability`)
      .set('Cookie', cookieA)
      .send({ isAvailable: false });

    expect(res.status).toBe(404);

    const dbItemB = await prisma.item.findUnique({ where: { id: itemB.id } });
    expect(dbItemB?.isAvailable).toBe(true);
  });

  it('Shop A CANNOT delete Shop B item', async () => {
    const res = await request(app)
      .delete(`/api/dashboard/items/${itemB.id}`)
      .set('Cookie', cookieA);

    expect(res.status).toBe(404);

    const dbItemB = await prisma.item.findUnique({ where: { id: itemB.id } });
    expect(dbItemB).not.toBeNull();
  });

  it('Passing a different shopId in request body is stripped and ignored', async () => {
    // Shop A tries to inject Shop B's ID to create a category in Shop B
    const res = await request(app)
      .post('/api/dashboard/categories')
      .set('Cookie', cookieA)
      .send({
        name: 'Injected Category',
        shopId: shopB.id, // malicious injection attempt
      });

    expect(res.status).toBe(201);
    // The created category MUST belong to Shop A, NEVER Shop B!
    expect(res.body.category.shopId).toBe(shopA.id);
    expect(res.body.category.shopId).not.toBe(shopB.id);
  });
});
