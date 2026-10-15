import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/auth.js';
import { Role, ShopStatus } from '@prisma/client';

describe('Shop Management & Features API Tests', () => {
  let shop: any;
  let cookie: string[];
  let categoryId: string;
  let itemId: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword('FeaturePass123!');
    shop = await prisma.shop.create({
      data: {
        name: 'Feature Shop',
        slug: 'feature-shop-' + Date.now(),
        status: ShopStatus.ACTIVE,
        settings: { create: { brandColor: '#EA580C', templateKey: 'classic-cream' } },
        users: {
          create: {
            loginId: 'feature_owner_' + Date.now(),
            passwordHash,
            role: Role.SHOP_OWNER,
            mustChangePassword: false,
          },
        },
      },
      include: { users: true },
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ loginId: shop.users[0].loginId, password: 'FeaturePass123!' });
    cookie = loginRes.headers['set-cookie'];
  });

  it('creates and lists categories', async () => {
    const res = await request(app)
      .post('/api/dashboard/categories')
      .set('Cookie', cookie)
      .send({ name: 'Mains', isVisible: true });

    expect(res.status).toBe(201);
    expect(res.body.category.name).toBe('Mains');
    categoryId = res.body.category.id;

    const listRes = await request(app)
      .get('/api/dashboard/categories')
      .set('Cookie', cookie);

    expect(listRes.status).toBe(200);
    expect(listRes.body.categories.length).toBeGreaterThanOrEqual(1);
  });

  it('creates, reads, toggles availability, and updates items', async () => {
    const res = await request(app)
      .post('/api/dashboard/items')
      .set('Cookie', cookie)
      .send({
        categoryId,
        name: 'Truffle Burger',
        description: 'Prime angus beef with truffle aioli',
        price: 15.5,
        isVeg: false,
        spiceLevel: 1,
        tags: ['Gourmet'],
        isAvailable: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.item.name).toBe('Truffle Burger');
    expect(res.body.item.isAvailable).toBe(true);
    itemId = res.body.item.id;

    // Toggle availability
    const toggleRes = await request(app)
      .patch(`/api/dashboard/items/${itemId}/availability`)
      .set('Cookie', cookie)
      .send({ isAvailable: false });

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.item.isAvailable).toBe(false);

    // Update item details
    const updateRes = await request(app)
      .put(`/api/dashboard/items/${itemId}`)
      .set('Cookie', cookie)
      .send({ price: 16.0, isAvailable: true });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.item.price).toBe(16.0);
    expect(updateRes.body.item.isAvailable).toBe(true);
  });

  it('blocks deleting a category that has items unless moving them', async () => {
    // Attempting to delete categoryId which contains 'Truffle Burger'
    const blockRes = await request(app)
      .delete(`/api/dashboard/categories/${categoryId}`)
      .set('Cookie', cookie);

    expect(blockRes.status).toBe(400);
    expect(blockRes.body.hasItems).toBe(true);
    expect(blockRes.body.itemCount).toBe(1);

    // Create a new target category and move items into it
    const cat2Res = await request(app)
      .post('/api/dashboard/categories')
      .set('Cookie', cookie)
      .send({ name: 'Burgers & Sandwiches' });

    const targetCategoryId = cat2Res.body.category.id;

    // Delete with targetCategoryId
    const deleteRes = await request(app)
      .delete(`/api/dashboard/categories/${categoryId}?targetCategoryId=${targetCategoryId}`)
      .set('Cookie', cookie);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Verify item moved to new category
    const movedItem = await prisma.item.findUnique({ where: { id: itemId } });
    expect(movedItem?.categoryId).toBe(targetCategoryId);
  });

  it('serves QR downloads in PNG, SVG, and printable PDF formats', async () => {
    // PNG
    const pngRes = await request(app)
      .get('/api/dashboard/qr/download?format=png')
      .set('Cookie', cookie);
    expect(pngRes.status).toBe(200);
    expect(pngRes.headers['content-type']).toBe('image/png');

    // SVG
    const svgRes = await request(app)
      .get('/api/dashboard/qr/download?format=svg')
      .set('Cookie', cookie);
    expect(svgRes.status).toBe(200);
    expect(svgRes.headers['content-type']).toContain('svg');

    // PDF A4
    const pdfRes = await request(app)
      .get('/api/dashboard/qr/download?format=pdf-a4')
      .set('Cookie', cookie);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');

    // PDF Table Tent
    const tentRes = await request(app)
      .get('/api/dashboard/qr/download?format=pdf-table-tent')
      .set('Cookie', cookie);
    expect(tentRes.status).toBe(200);
    expect(tentRes.headers['content-type']).toBe('application/pdf');
  });

  it('exports menu items to CSV and imports with row-level validation', async () => {
    // Export CSV
    const exportRes = await request(app)
      .get('/api/dashboard/csv/export')
      .set('Cookie', cookie);

    expect(exportRes.status).toBe(200);
    expect(exportRes.headers['content-type']).toContain('text/csv');
    expect(exportRes.text).toContain('category,name,description,price,isVeg,spiceLevel,tags,isAvailable');

    // Import CSV with valid rows and an invalid row
    const csvData = [
      'category,name,description,price,isVeg,spiceLevel,tags,isAvailable',
      'Beverages,Lemon Iced Tea,Refreshing cold tea,3.50,true,0,Cold,true',
      'Beverages,Mango Smoothie,Fresh mango and yogurt,5.00,true,0,Smoothie,true',
      'Bakery,,Missing Name,-1,true,0,Invalid,true', // invalid row: missing name & negative price
    ].join('\n');

    const importRes = await request(app)
      .post('/api/dashboard/csv/import')
      .set('Cookie', cookie)
      .attach('file', Buffer.from(csvData), 'test.csv');

    expect(importRes.status).toBe(200);
    expect(importRes.body.successCount).toBe(2);
    expect(importRes.body.failureCount).toBeGreaterThanOrEqual(1);
    expect(importRes.body.errors.length).toBeGreaterThanOrEqual(1);
  });
});
