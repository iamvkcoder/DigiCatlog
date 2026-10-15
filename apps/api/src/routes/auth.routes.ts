import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validator.js';
import { loginSchema, changePasswordSchema } from '@digicatlog/shared';

const router = Router();

// Strict rate limiter on login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
});

router.post('/login', loginLimiter, validateBody(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword
);

export default router;
