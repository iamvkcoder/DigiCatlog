import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { hashPassword } from './lib/auth.js';
import { Role } from '@prisma/client';

async function bootstrap() {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN },
    });

    if (!existingAdmin) {
      console.log(`⚡ No Super Admin detected in database. Provisioning default Super Admin (${env.SUPER_ADMIN_LOGIN})...`);
      const passwordHash = await hashPassword(env.SUPER_ADMIN_PASSWORD);
      await prisma.user.create({
        data: {
          loginId: env.SUPER_ADMIN_LOGIN,
          passwordHash,
          role: Role.SUPER_ADMIN,
          mustChangePassword: false,
          isActive: true,
        },
      });
      console.log(`✅ Default Super Admin created successfully with Login ID: ${env.SUPER_ADMIN_LOGIN}`);
    } else if (process.env.SYNC_SUPER_ADMIN_PASSWORD === 'true') {
      const passwordHash = await hashPassword(env.SUPER_ADMIN_PASSWORD);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          loginId: env.SUPER_ADMIN_LOGIN,
          passwordHash,
          failedLoginAttempts: 0,
          lockoutUntil: null,
        },
      });
      console.log(`🔄 Super Admin credentials synchronized from environment variables`);
    }
  } catch (error) {
    console.error('⚠️ Could not verify/provision Super Admin on startup:', error);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 DIGICATLOG API server listening on http://localhost:${env.PORT}`);
    console.log(`📡 Environment: ${env.NODE_ENV}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

bootstrap();
