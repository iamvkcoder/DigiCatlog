import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { errorHandler } from './middlewares/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import shopRoutes from './routes/shop.routes.js';
import publicRoutes from './routes/public.routes.js';

export const app = express();

// Security Headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
const allowedOrigins = [
  env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static local uploads serving (fallback if Cloudinary is not used)
const uploadsDir = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Health Check endpoint for Render / monitoring
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message,
    });
  }
});

// Modular Monolith API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', shopRoutes);
app.use('/api/public', publicRoutes);

// Direct Scan Redirect: if a QR code pointing directly to API domain is scanned, redirect to the frontend menu
app.get('/m/:slug', (req, res) => {
  const slug = req.params.slug;
  let targetOrigin = 'https://digicatlog.vercel.app';

  if (env.CLIENT_ORIGIN && !env.CLIENT_ORIGIN.includes('localhost') && !env.CLIENT_ORIGIN.includes('onrender.com')) {
    targetOrigin = env.CLIENT_ORIGIN;
  } else if (req.headers['x-forwarded-host']) {
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    targetOrigin = `${proto}://${req.headers['x-forwarded-host']}`;
  }

  res.redirect(301, `${targetOrigin.replace(/\/+$/, '')}/m/${slug}`);
});

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use(errorHandler);
