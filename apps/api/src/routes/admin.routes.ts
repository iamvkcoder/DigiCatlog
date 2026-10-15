import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validator.js';
import { createShopSchema, updateShopSchema, resetPasswordSchema, Role } from '@digicatlog/shared';

const router = Router();

// Guard all admin routes with authentication and SUPER_ADMIN role
router.use(authenticate, requireRole(Role.SUPER_ADMIN));

router.get('/stats', adminController.getStats);
router.get('/shops', adminController.getShops);
router.post('/shops', validateBody(createShopSchema), adminController.createShop);
router.patch('/shops/:id', validateBody(updateShopSchema), adminController.updateShop);
router.post(
  '/shops/:id/reset-password',
  validateBody(resetPasswordSchema),
  adminController.resetShopPassword
);
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
