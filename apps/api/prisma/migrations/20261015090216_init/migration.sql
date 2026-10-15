-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'SHOP_OWNER');

-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "loginId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SHOP_OWNER',
    "shopId" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ShopStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "shopId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "logoPublicId" TEXT,
    "coverUrl" TEXT,
    "coverPublicId" TEXT,
    "brandColor" TEXT DEFAULT '#8B4513',
    "templateKey" TEXT NOT NULL DEFAULT 'classic-cream',
    "phone" TEXT,
    "whatsapp" TEXT,
    "address" TEXT,
    "mapsUrl" TEXT,
    "openingHours" JSONB,
    "socialLinks" JSONB,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("shopId")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "isVeg" BOOLEAN NOT NULL DEFAULT true,
    "spiceLevel" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrScan" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uaHash" TEXT,

    CONSTRAINT "QrScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "shopId" TEXT,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");

-- CreateIndex
CREATE INDEX "User_shopId_idx" ON "User"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");

-- CreateIndex
CREATE INDEX "Shop_slug_idx" ON "Shop"("slug");

-- CreateIndex
CREATE INDEX "Shop_status_idx" ON "Shop"("status");

-- CreateIndex
CREATE INDEX "Category_shopId_idx" ON "Category"("shopId");

-- CreateIndex
CREATE INDEX "Category_shopId_sortOrder_idx" ON "Category"("shopId", "sortOrder");

-- CreateIndex
CREATE INDEX "Item_shopId_idx" ON "Item"("shopId");

-- CreateIndex
CREATE INDEX "Item_shopId_categoryId_idx" ON "Item"("shopId", "categoryId");

-- CreateIndex
CREATE INDEX "Item_shopId_sortOrder_idx" ON "Item"("shopId", "sortOrder");

-- CreateIndex
CREATE INDEX "QrScan_shopId_idx" ON "QrScan"("shopId");

-- CreateIndex
CREATE INDEX "QrScan_shopId_scannedAt_idx" ON "QrScan"("shopId", "scannedAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_shopId_idx" ON "AuditLog"("shopId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSettings" ADD CONSTRAINT "ShopSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrScan" ADD CONSTRAINT "QrScan_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
