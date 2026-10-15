import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  SUPER_ADMIN_LOGIN: z.string().default('superadmin'),
  SUPER_ADMIN_PASSWORD: z.string().default('Admin@DigiCatlog2025!'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ FATAL: Invalid or missing environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
