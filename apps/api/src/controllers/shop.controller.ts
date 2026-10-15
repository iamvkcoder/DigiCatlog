import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { uploadImage, deleteImage } from '../lib/storage.js';
import { generateQrPng, generateQrSvg, generatePrintablePdf } from '../lib/qr.js';
import { menuCache } from '../lib/cache.js';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
  ReorderCategoriesInput,
  CreateItemInput,
  UpdateItemInput,
  ToggleItemAvailabilityInput,
  ReorderItemsInput,
  UpdateShopSettingsInput,
  csvRowSchema,
  CsvImportError,
} from '@digicatlog/shared';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

function getPublicMenuUrl(req: Request, slug: string): string {
  const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
  return `${origin}/m/${slug}`;
}

// -------------------------------------------------------------
// Analytics & Stats
// -------------------------------------------------------------
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [scansToday, scans7d, scans30d, categories] = await Promise.all([
    prisma.qrScan.count({
      where: { shopId, scannedAt: { gte: startOfToday } },
    }),
    prisma.qrScan.count({
      where: { shopId, scannedAt: { gte: sevenDaysAgo } },
    }),
    prisma.qrScan.count({
      where: { shopId, scannedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.category.findMany({
      where: { shopId },
      select: {
        name: true,
        _count: { select: { items: true } },
      },
      orderBy: { items: { _count: 'desc' } },
      take: 5,
    }),
  ]);

  const topCategories = categories.map((c) => ({
    categoryName: c.name,
    itemCount: c._count.items,
  }));

  res.json({
    scansToday,
    scans7d,
    scans30d,
    topCategories,
  });
}

// -------------------------------------------------------------
// Settings & Profile
// -------------------------------------------------------------
export async function getSettings(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: { settings: true },
  });

  if (!shop || !shop.settings) {
    res.status(404).json({ error: 'Shop settings not found.' });
    return;
  }

  res.json({
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      status: shop.status,
      expiresAt: shop.expiresAt,
    },
    settings: shop.settings,
  });
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;
  const input = req.body as UpdateShopSettingsInput;

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) {
    res.status(404).json({ error: 'Shop not found.' });
    return;
  }

  const updatedSettings = await prisma.shopSettings.upsert({
    where: { shopId },
    update: {
      ...(input.brandColor !== undefined && { brandColor: input.brandColor }),
      ...(input.templateKey !== undefined && { templateKey: input.templateKey }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.whatsapp !== undefined && { whatsapp: input.whatsapp }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.mapsUrl !== undefined && { mapsUrl: input.mapsUrl }),
      ...(input.openingHours !== undefined && { openingHours: input.openingHours as any }),
      ...(input.socialLinks !== undefined && { socialLinks: input.socialLinks as any }),
      ...(input.currency !== undefined && { currency: input.currency }),
    },
    create: {
      shopId,
      brandColor: input.brandColor || '#8B4513',
      templateKey: input.templateKey || 'classic-cream',
      phone: input.phone,
      whatsapp: input.whatsapp,
      address: input.address,
      mapsUrl: input.mapsUrl,
      openingHours: (input.openingHours as any) || undefined,
      socialLinks: (input.socialLinks as any) || undefined,
      currency: input.currency || 'USD',
    },
  });

  menuCache.invalidateShop(shop.slug);

  res.json({ settings: updatedSettings });
}

// -------------------------------------------------------------
// Image Uploads
// -------------------------------------------------------------
export async function uploadAsset(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'No image file uploaded.' });
    return;
  }

  const folder = (req.query.folder as string) || 'shop';

  try {
    const result = await uploadImage(req.file.buffer, req.file.mimetype, folder);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Image upload failed.' });
  }
}

// -------------------------------------------------------------
// Categories
// -------------------------------------------------------------
export async function getCategories(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;

  const categories = await prisma.category.findMany({
    where: { shopId },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { items: true } },
    },
  });

  const formatted = categories.map((c) => ({
    id: c.id,
    shopId: c.shopId,
    name: c.name,
    sortOrder: c.sortOrder,
    isVisible: c.isVisible,
    itemCount: c._count.items,
  }));

  res.json({ categories: formatted });
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;
  const { name, isVisible } = req.body as CreateCategoryInput;

  const highest = await prisma.category.findFirst({
    where: { shopId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const nextSortOrder = (highest?.sortOrder ?? -1) + 1;

  const category = await prisma.category.create({
    data: {
      shopId,
      name,
      isVisible: isVisible ?? true,
      sortOrder: nextSortOrder,
    },
  });

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
  if (shop) menuCache.invalidateShop(shop.slug);

  res.status(201).json({ category });
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;
  const id = req.params.id as string;
  const { name, isVisible, sortOrder } = req.body as UpdateCategoryInput;

  const existing = await prisma.category.findFirst({
    where: { id, shopId },
  });

  if (!existing) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(isVisible !== undefined && { isVisible }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
  if (shop) menuCache.invalidateShop(shop.slug);

  res.json({ category: updated });
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;
  const id = req.params.id as string;
  const { targetCategoryId } = req.query as { targetCategoryId?: string };

  const category = await prisma.category.findFirst({
    where: { id, shopId },
    include: { _count: { select: { items: true } } },
  });

  if (!category) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }

  const itemCount = category._count.items;

  if (itemCount > 0) {
    if (!targetCategoryId) {
      res.status(400).json({
        error: `Category contains ${itemCount} item(s). Please move items to another category or confirm deletion.`,
        hasItems: true,
        itemCount,
      });
      return;
    }

    // Verify target category belongs to this shop
    const target = await prisma.category.findFirst({
      where: { id: targetCategoryId, shopId },
    });

    if (!target) {
      res.status(400).json({ error: 'Target category not found in your shop.' });
      return;
    }

    // Move items to target category
    await prisma.item.updateMany({
      where: { categoryId: id, shopId },
      data: { categoryId: targetCategoryId },
    });
  }

  await prisma.category.delete({ where: { id } });

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
  if (shop) menuCache.invalidateShop(shop.slug);

  res.json({ success: true, message: 'Category deleted successfully.' });
}

export async function reorderCategories(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;
  const { categoryIds } = req.body as ReorderCategoriesInput;

  await prisma.$transaction(
    categoryIds.map((id, index) =>
      prisma.category.updateMany({
        where: { id, shopId },
        data: { sortOrder: index },
      })
    )
  );

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
  if (shop) menuCache.invalidateShop(shop.slug);

  res.json({ success: true, message: 'Categories reordered successfully.' });
}

// -------------------------------------------------------------
// Items
// -------------------------------------------------------------
export async function getItems(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;
  const { categoryId, isAvailable, search } = req.query as {
    categoryId?: string;
    isAvailable?: string;
    search?: string;
  };

  const where: any = { shopId };

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (isAvailable !== undefined && isAvailable !== '') {
    where.isAvailable = isAvailable === 'true';
  }

  if (search && search.trim() !== '') {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { tags: { has: term } },
    ];
  }

  const items = await prisma.item.findMany({
    where,
    orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
    include: {
      category: { select: { name: true } },
    },
  });

  const formatted = items.map((item) => ({
    id: item.id,
    shopId: item.shopId,
    categoryId: item.categoryId,
    categoryName: item.category.name,
    name: item.name,
    description: item.description,
    price: Number(item.price),
    imageUrl: item.imageUrl,
    imagePublicId: item.imagePublicId,
    isVeg: item.isVeg,
    spiceLevel: item.spiceLevel,
    tags: item.tags,
    isAvailable: item.isAvailable,
    sortOrder: item.sortOrder,
  }));

  res.json({ items: formatted });
}

export async function createItem(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;
  const input = req.body as CreateItemInput;

  // Verify category belongs to this shop
  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, shopId },
  });

  if (!category) {
    res.status(400).json({ error: 'Selected category does not exist in your shop.' });
    return;
  }

  const highest = await prisma.item.findFirst({
    where: { shopId, categoryId: input.categoryId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const nextSortOrder = (highest?.sortOrder ?? -1) + 1;

  const item = await prisma.item.create({
    data: {
      shopId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      price: input.price,
      imageUrl: input.imageUrl,
      imagePublicId: input.imagePublicId,
      isVeg: input.isVeg ?? true,
      spiceLevel: input.spiceLevel ?? 0,
      tags: input.tags ?? [],
      isAvailable: input.isAvailable ?? true,
      sortOrder: nextSortOrder,
    },
  });

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
  if (shop) menuCache.invalidateShop(shop.slug);

  res.status(201).json({ item: { ...item, price: Number(item.price) } });
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;
  const id = req.params.id as string;
  const input = req.body as UpdateItemInput;

  const existing = await prisma.item.findFirst({
    where: { id, shopId },
  });

  if (!existing) {
    res.status(404).json({ error: 'Item not found in your shop.' });
    return;
  }

  // If changing category, verify category belongs to shop
  if (input.categoryId && input.categoryId !== existing.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, shopId },
    });
    if (!category) {
      res.status(400).json({ error: 'Selected category does not belong to your shop.' });
      return;
    }
  }

  // If image changed, delete old image asset
  if (input.imageUrl && input.imagePublicId && input.imagePublicId !== existing.imagePublicId) {
    await deleteImage(existing.imagePublicId);
  }

  const updated = await prisma.item.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
      ...(input.imagePublicId !== undefined && { imagePublicId: input.imagePublicId }),
      ...(input.isVeg !== undefined && { isVeg: input.isVeg }),
      ...(input.spiceLevel !== undefined && { spiceLevel: input.spiceLevel }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.isAvailable !== undefined && { isAvailable: input.isAvailable }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
    },
  });

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
  if (shop) menuCache.invalidateShop(shop.slug);

  res.json({ item: { ...updated, price: Number(updated.price) } });
}

export async function toggleItemAvailability(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;
  const id = req.params.id as string;
  const { isAvailable } = req.body as ToggleItemAvailabilityInput;

  const existing = await prisma.item.findFirst({
    where: { id, shopId },
  });

  if (!existing) {
    res.status(404).json({ error: 'Item not found in your shop.' });
    return;
  }

  const updated = await prisma.item.update({
    where: { id },
    data: { isAvailable },
  });

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
  if (shop) menuCache.invalidateShop(shop.slug);

  res.json({
    item: {
      id: updated.id,
      isAvailable: updated.isAvailable,
      name: updated.name,
    },
  });
}

export async function deleteItem(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;
  const id = req.params.id as string;

  const item = await prisma.item.findFirst({
    where: { id, shopId },
  });

  if (!item) {
    res.status(404).json({ error: 'Item not found in your shop.' });
    return;
  }

  if (item.imagePublicId) {
    await deleteImage(item.imagePublicId);
  }

  await prisma.item.delete({ where: { id } });

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
  if (shop) menuCache.invalidateShop(shop.slug);

  res.json({ success: true, message: 'Item deleted successfully.' });
}

export async function reorderItems(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;
  const { categoryId, itemIds } = req.body as ReorderItemsInput;

  // Verify category belongs to shop
  const category = await prisma.category.findFirst({
    where: { id: categoryId, shopId },
  });

  if (!category) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }

  await prisma.$transaction(
    itemIds.map((id, index) =>
      prisma.item.updateMany({
        where: { id, categoryId, shopId },
        data: { sortOrder: index },
      })
    )
  );

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
  if (shop) menuCache.invalidateShop(shop.slug);

  res.json({ success: true, message: 'Items reordered successfully.' });
}

// -------------------------------------------------------------
// QR Details & Downloads
// -------------------------------------------------------------
export async function getQrDetails(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: { settings: true },
  });

  if (!shop) {
    res.status(404).json({ error: 'Shop not found.' });
    return;
  }

  const menuUrl = getPublicMenuUrl(req, shop.slug);

  res.json({
    menuUrl,
    slug: shop.slug,
    shopName: shop.name,
    endpoints: {
      png: `/api/dashboard/qr/download?format=png`,
      svg: `/api/dashboard/qr/download?format=svg`,
      pdfA4: `/api/dashboard/qr/download?format=pdf-a4`,
      pdfTableTent: `/api/dashboard/qr/download?format=pdf-table-tent`,
    },
  });
}

export async function downloadQr(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;
  const { format = 'png' } = req.query as { format?: string };

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: { settings: true },
  });

  if (!shop) {
    res.status(404).json({ error: 'Shop not found.' });
    return;
  }

  const menuUrl = getPublicMenuUrl(req, shop.slug);
  const brandColor = shop.settings?.brandColor || '#EA580C';

  if (format === 'svg') {
    const svg = await generateQrSvg(menuUrl);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${shop.slug}-qr.svg"`);
    res.send(svg);
    return;
  }

  if (format === 'pdf-a4' || format === 'pdf-table-tent') {
    const isTableTent = format === 'pdf-table-tent';
    const pdfBuffer = await generatePrintablePdf({
      shopName: shop.name,
      menuUrl,
      brandColor,
      format: isTableTent ? 'table-tent' : 'a4',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${shop.slug}-qr-${isTableTent ? 'table-tent' : 'a4'}.pdf"`
    );
    res.send(pdfBuffer);
    return;
  }

  // Default PNG
  const pngBuffer = await generateQrPng(menuUrl, 800);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `attachment; filename="${shop.slug}-qr.png"`);
  res.send(pngBuffer);
}

// -------------------------------------------------------------
// Bulk CSV Export & Import
// -------------------------------------------------------------
export async function exportCsv(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;

  const items = await prisma.item.findMany({
    where: { shopId },
    orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
    include: { category: { select: { name: true } } },
  });

  const header = 'category,name,description,price,isVeg,spiceLevel,tags,isAvailable\n';
  const rows = items.map((item) => {
    const escape = (val: string | null | undefined) =>
      `"${(val || '').replace(/"/g, '""')}"`;
    return [
      escape(item.category.name),
      escape(item.name),
      escape(item.description),
      Number(item.price),
      item.isVeg ? 'true' : 'false',
      item.spiceLevel,
      escape(item.tags.join(', ')),
      item.isAvailable ? 'true' : 'false',
    ].join(',');
  });

  const csvContent = header + rows.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="menu-items.csv"`);
  res.send(csvContent);
}

export async function importCsv(req: Request, res: Response): Promise<void> {
  const shopId = req.shopId!;

  if (!req.file) {
    res.status(400).json({ error: 'Please upload a CSV file.' });
    return;
  }

  const results: any[] = [];
  const errors: CsvImportError[] = [];
  let rowNumber = 1; // Header is line 1

  const stream = Readable.from(req.file.buffer).pipe(
    csvParser({
      mapHeaders: ({ header }) => header.trim().toLowerCase(),
    })
  );

  for await (const row of stream) {
    rowNumber++;
    // Normalize keys
    const rawData = {
      category: row.category,
      name: row.name,
      description: row.description,
      price: row.price,
      isVeg: row.isveg ?? row.veg ?? row['is veg'],
      spiceLevel: row.spicelevel ?? row.spice ?? row['spice level'],
      tags: row.tags,
      isAvailable: row.isavailable ?? row.available ?? row['is available'],
    };

    const parsed = csvRowSchema.safeParse(rawData);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          row: rowNumber,
          field: issue.path.join('.'),
          message: issue.message,
        });
      }
    } else {
      results.push(parsed.data);
    }
  }

  if (results.length === 0) {
    res.status(400).json({
      totalRows: rowNumber - 1,
      successCount: 0,
      failureCount: errors.length,
      errors,
      message: 'No valid rows found in CSV.',
    });
    return;
  }

  // Pre-fetch or create categories for valid items
  const categoryMap = new Map<string, string>();
  const existingCategories = await prisma.category.findMany({ where: { shopId } });
  for (const c of existingCategories) {
    categoryMap.set(c.name.trim().toLowerCase(), c.id);
  }

  let nextSortOrder = existingCategories.length;

  for (const itemData of results) {
    const catNameLower = itemData.category.trim().toLowerCase();
    if (!categoryMap.has(catNameLower)) {
      const newCat = await prisma.category.create({
        data: {
          shopId,
          name: itemData.category.trim(),
          sortOrder: nextSortOrder++,
          isVisible: true,
        },
      });
      categoryMap.set(catNameLower, newCat.id);
    }

    const categoryId = categoryMap.get(catNameLower)!;
    await prisma.item.create({
      data: {
        shopId,
        categoryId,
        name: itemData.name,
        description: itemData.description || null,
        price: itemData.price,
        isVeg: itemData.isVeg,
        spiceLevel: itemData.spiceLevel,
        tags: itemData.tags,
        isAvailable: itemData.isAvailable,
      },
    });
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
  if (shop) menuCache.invalidateShop(shop.slug);

  res.json({
    totalRows: rowNumber - 1,
    successCount: results.length,
    failureCount: errors.length,
    errors,
  });
}
