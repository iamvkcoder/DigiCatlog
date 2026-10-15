import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  const statusCode = (err as { statusCode?: number }).statusCode || 500;
  const message = statusCode === 500 && env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  if (env.NODE_ENV !== 'production' || statusCode === 500) {
    console.error(`[Error] ${statusCode}:`, err);
  }

  res.status(statusCode).json({
    error: message,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
