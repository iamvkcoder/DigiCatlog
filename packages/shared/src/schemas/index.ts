import { z } from 'zod';
import { Role, ShopStatus, TemplateKey } from '../constants/index.js';

export const loginSchema = z.object({
  loginId: z
    .string()
    .trim()
    .min(3, 'Login ID must be at least 3 characters')
    .max(50, 'Login ID must not exceed 50 characters'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const createShopSchema = z.object({
  name: z.string().trim().min(2, 'Shop name must be at least 2 characters').max(100),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  loginId: z
    .string()
    .trim()
    .min(3, 'Login ID must be at least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Login ID can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export type CreateShopInput = z.infer<typeof createShopSchema>;

export const updateShopSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  status: z.enum([ShopStatus.ACTIVE, ShopStatus.SUSPENDED]).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export type UpdateShopInput = z.infer<typeof updateShopSchema>;

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100)
    .optional(),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(60),
  isVisible: z.boolean().default(true),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const reorderCategoriesSchema = z.object({
  categoryIds: z.array(z.string().uuid('Invalid category ID')).min(1),
});

export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;

export const createItemSchema = z.object({
  categoryId: z.string().uuid('Valid category is required'),
  name: z.string().trim().min(1, 'Item name is required').max(100),
  description: z.string().trim().max(500).optional().nullable(),
  price: z.coerce.number().min(0, 'Price must be greater than or equal to 0'),
  imageUrl: z.string().url().optional().nullable(),
  imagePublicId: z.string().optional().nullable(),
  isVeg: z.boolean().default(true),
  spiceLevel: z.coerce.number().int().min(0).max(3).default(0),
  tags: z.array(z.string().trim()).default([]),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = createItemSchema.partial();

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export const toggleItemAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export type ToggleItemAvailabilityInput = z.infer<typeof toggleItemAvailabilitySchema>;

export const reorderItemsSchema = z.object({
  categoryId: z.string().uuid('Valid category ID required'),
  itemIds: z.array(z.string().uuid('Invalid item ID')).min(1),
});

export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>;

const dayScheduleSchema = z.object({
  open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM'),
  close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM'),
  isClosed: z.boolean(),
});

export const openingHoursSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
});

export const socialLinksSchema = z.object({
  instagram: z.string().url().or(z.literal('')).optional().nullable(),
  facebook: z.string().url().or(z.literal('')).optional().nullable(),
  twitter: z.string().url().or(z.literal('')).optional().nullable(),
  website: z.string().url().or(z.literal('')).optional().nullable(),
});

export const updateShopSettingsSchema = z.object({
  brandColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color').optional().nullable(),
  templateKey: z.enum([
    TemplateKey.CLASSIC_CREAM,
    TemplateKey.MODERN_DARK,
    TemplateKey.MINIMAL_WHITE,
    TemplateKey.VIBRANT_CAFE,
  ]).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  whatsapp: z.string().trim().max(30).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  mapsUrl: z.string().url().or(z.literal('')).optional().nullable(),
  openingHours: openingHoursSchema.optional().nullable(),
  socialLinks: socialLinksSchema.optional().nullable(),
  currency: z.string().trim().min(1).max(10).optional(),
});

export type UpdateShopSettingsInput = z.infer<typeof updateShopSettingsSchema>;

export const csvRowSchema = z.object({
  category: z.string().trim().min(1, 'Category is required'),
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional(),
  price: z.coerce.number().min(0, 'Price must be >= 0'),
  isVeg: z.preprocess((val) => {
    if (typeof val === 'string') {
      const lower = val.trim().toLowerCase();
      return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'veg';
    }
    return Boolean(val);
  }, z.boolean()),
  spiceLevel: z.coerce.number().int().min(0).max(3).default(0),
  tags: z.preprocess((val) => {
    if (typeof val === 'string') {
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return Array.isArray(val) ? val : [];
  }, z.array(z.string())),
  isAvailable: z.preprocess((val) => {
    if (val === undefined || val === '') return true;
    if (typeof val === 'string') {
      const lower = val.trim().toLowerCase();
      return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'in stock';
    }
    return Boolean(val);
  }, z.boolean()).default(true),
});

export type CsvRowInput = z.infer<typeof csvRowSchema>;
