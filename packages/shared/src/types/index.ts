import { RoleType, ShopStatusType, TemplateKeyType } from '../constants/index.js';

export interface OpeningHourDay {
  open: string; // e.g. "09:00"
  close: string; // e.g. "22:00"
  isClosed: boolean;
}

export type OpeningHours = Record<
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
  OpeningHourDay
>;

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  website?: string;
}

export interface AuthUser {
  id: string;
  loginId: string;
  role: RoleType;
  shopId: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  lastLoginAt?: string | null;
}

export interface UserSummary {
  id: string;
  loginId: string;
  role: RoleType;
  shopId: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ShopSummary {
  id: string;
  name: string;
  slug: string;
  status: ShopStatusType;
  expiresAt: string | null;
  createdAt: string;
  ownerLoginId?: string;
  itemCount?: number;
  categoryCount?: number;
  scanCount?: number;
}

export interface ShopSettingsDTO {
  shopId: string;
  logoUrl?: string | null;
  logoPublicId?: string | null;
  coverUrl?: string | null;
  coverPublicId?: string | null;
  brandColor?: string | null;
  templateKey: TemplateKeyType;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  mapsUrl?: string | null;
  openingHours?: OpeningHours | null;
  socialLinks?: SocialLinks | null;
  currency: string;
}

export interface CategoryDTO {
  id: string;
  shopId: string;
  name: string;
  sortOrder: number;
  isVisible: boolean;
  itemCount?: number;
}

export interface ItemDTO {
  id: string;
  shopId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  isVeg: boolean;
  spiceLevel: number; // 0-3
  tags: string[];
  isAvailable: boolean;
  sortOrder: number;
  categoryName?: string;
}

export interface PublicMenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  items: PublicMenuItem[];
}

export interface PublicMenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isVeg: boolean;
  spiceLevel: number;
  tags: string[];
  isAvailable: boolean;
  sortOrder: number;
}

export interface PublicMenuResponse {
  shop: {
    name: string;
    slug: string;
    status: ShopStatusType;
    logoUrl?: string | null;
    coverUrl?: string | null;
    brandColor?: string | null;
    templateKey: TemplateKeyType;
    phone?: string | null;
    whatsapp?: string | null;
    address?: string | null;
    mapsUrl?: string | null;
    openingHours?: OpeningHours | null;
    socialLinks?: SocialLinks | null;
    currency: string;
    isOpenNow: boolean;
  };
  categories: PublicMenuCategory[];
}

export interface SuperAdminDashboardStats {
  totalShops: number;
  activeShops: number;
  suspendedShops: number;
  expiringIn7Days: number;
}

export interface ShopAnalyticsStats {
  scansToday: number;
  scans7d: number;
  scans30d: number;
  topCategories: { categoryName: string; itemCount: number }[];
}

export interface AuditLogDTO {
  id: string;
  actorId: string;
  actorLoginId?: string;
  shopId?: string | null;
  shopName?: string | null;
  action: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface CsvImportError {
  row: number;
  field: string;
  message: string;
}

export interface CsvImportResult {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: CsvImportError[];
}
