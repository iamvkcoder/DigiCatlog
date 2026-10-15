import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/auth.js';
import { Role } from '@prisma/client';

describe('Auth & Role Guards API Tests', () => {
  const testLogin = 'test_auth_user_' + Date.now();
  const testPassword = 'TestPassword123!';
  let userId: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword(testPassword);
    const shop = await prisma.shop.create({
      data: {
        name: 'Auth Test Shop',
        slug: 'auth-test-shop-' + Date.now(),
        settings: { create: { templateKey: 'classic-cream' } },
      },
    });

    const user = await prisma.user.create({
      data: {
        loginId: testLogin,
        passwordHash,
        role: Role.SHOP_OWNER,
        shopId: shop.id,
        mustChangePassword: true,
        isActive: true,
      },
    });
    userId = user.id;
  });

  it('rejects login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ loginId: testLogin, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid login ID or password.');
  });

  it('logs in successfully with valid credentials and sets auth cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ loginId: testLogin, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.loginId).toBe(testLogin);
    expect(res.body.user.mustChangePassword).toBe(true);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('digicatlog_session=');
  });

  it('enforces forced password change workflow', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ loginId: testLogin, password: testPassword });

    const cookie = loginRes.headers['set-cookie'];

    // Trying to access dashboard before password change must be blocked with MUST_CHANGE_PASSWORD
    const dashRes = await request(app)
      .get('/api/dashboard/stats')
      .set('Cookie', cookie);

    expect(dashRes.status).toBe(403);
    expect(dashRes.body.code).toBe('MUST_CHANGE_PASSWORD');

    // Change password
    const newPassword = 'NewSecretPassword2025!';
    const changeRes = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({
        currentPassword: testPassword,
        newPassword,
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.success).toBe(true);

    // Verify user record in DB has mustChangePassword = false
    const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(updatedUser?.mustChangePassword).toBe(false);
  });

  it('blocks non-super-admins from accessing super admin endpoints', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ loginId: testLogin, password: 'NewSecretPassword2025!' });

    const cookie = loginRes.headers['set-cookie'];

    const adminRes = await request(app)
      .get('/api/admin/shops')
      .set('Cookie', cookie);

    expect(adminRes.status).toBe(403);
    expect(adminRes.body.error).toContain('insufficient permissions');
  });

  it('triggers account lockout after repeated failed attempts', async () => {
    const bruteUser = 'brute_' + Date.now();
    const hash = await hashPassword('Secret123!');
    await prisma.user.create({
      data: {
        loginId: bruteUser,
        passwordHash: hash,
        role: Role.SHOP_OWNER,
      },
    });

    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ loginId: bruteUser, password: 'wrong' });
      expect(res.status).toBe(401);
    }

    // 5th attempt must trigger lockout
    const lockRes = await request(app)
      .post('/api/auth/login')
      .send({ loginId: bruteUser, password: 'wrong' });

    expect(lockRes.status).toBe(429);
    expect(lockRes.body.error).toContain('Account locked');
  });
});
