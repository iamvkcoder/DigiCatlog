import { Router } from 'express';
import multer from 'multer';
import * as shopController from '../controllers/shop.controller.js';
import {
  authenticate,
  requireRole,
  requireTenantShop,
  requirePasswordChanged,
} from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validator.js';
import {
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
  createItemSchema,
  updateItemSchema,
  toggleItemAvailabilitySchema,
  reorderItemsSchema,
  updateShopSettingsSchema,
  Role,
} from '@digicatlog/shared';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB max
});

// Guard all shop routes with auth, shop owner role, forced password change check, and tenant isolation
router.use(
  authenticate,
  requireRole(Role.SHOP_OWNER),
  requirePasswordChanged,
  requireTenantShop
);

// Analytics
router.get('/stats', shopController.getDashboardStats);

// Settings & Profile
router.get('/settings', shopController.getSettings);
router.put('/settings', validateBody(updateShopSettingsSchema), shopController.updateSettings);

// Image Uploads
router.post('/upload', upload.single('file'), shopController.uploadAsset);

// Categories
router.get('/categories', shopController.getCategories);
router.post('/categories', validateBody(createCategorySchema), shopController.createCategory);
router.put('/categories/reorder', validateBody(reorderCategoriesSchema), shopController.reorderCategories);
router.put('/categories/:id', validateBody(updateCategorySchema), shopController.updateCategory);
router.delete('/categories/:id', shopController.deleteCategory);

// Items
router.get('/items', shopController.getItems);
router.post('/items', validateBody(createItemSchema), shopController.createItem);
router.put('/items/reorder', validateBody(reorderItemsSchema), shopController.reorderItems);
router.patch(
  '/items/:id/availability',
  validateBody(toggleItemAvailabilitySchema),
  shopController.toggleItemAvailability
);
router.put('/items/:id', validateBody(updateItemSchema), shopController.updateItem);
router.delete('/items/:id', shopController.deleteItem);

// QR Details & Downloads
router.get('/qr', shopController.getQrDetails);
router.get('/qr/download', shopController.downloadQr);

// Bulk CSV
router.get('/csv/export', shopController.exportCsv);
router.post('/csv/import', upload.single('file'), shopController.importCsv);

export default router;
