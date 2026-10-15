export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SHOP_OWNER: 'SHOP_OWNER',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

export const ShopStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type ShopStatusType = (typeof ShopStatus)[keyof typeof ShopStatus];

export const TemplateKey = {
  CLASSIC_CREAM: 'classic-cream',
  MODERN_DARK: 'modern-dark',
  MINIMAL_WHITE: 'minimal-white',
  VIBRANT_CAFE: 'vibrant-cafe',
} as const;

export type TemplateKeyType = (typeof TemplateKey)[keyof typeof TemplateKey];

export interface TemplateDefinition {
  key: TemplateKeyType;
  name: string;
  description: string;
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  badgeBg: string;
  badgeText: string;
  fontFamily: 'serif' | 'sans' | 'mono';
  previewImageUrl?: string;
}

export const TEMPLATES: Record<TemplateKeyType, TemplateDefinition> = {
  'classic-cream': {
    key: 'classic-cream',
    name: 'Classic Cream',
    description: 'Warm paper tones, elegant serif accents, timeless dining aesthetic.',
    primaryColor: '#8B4513',
    backgroundColor: '#FDFBF7',
    surfaceColor: '#FFFFFF',
    textColor: '#2D241E',
    mutedTextColor: '#7D7065',
    badgeBg: '#F5EBE1',
    badgeText: '#633811',
    fontFamily: 'serif',
  },
  'modern-dark': {
    key: 'modern-dark',
    name: 'Modern Dark',
    description: 'Sleek dark slate with high-contrast amber/gold highlights for lounges & bars.',
    primaryColor: '#F59E0B',
    backgroundColor: '#0F172A',
    surfaceColor: '#1E293B',
    textColor: '#F8FAFC',
    mutedTextColor: '#94A3B8',
    badgeBg: '#334155',
    badgeText: '#FBBF24',
    fontFamily: 'sans',
  },
  'minimal-white': {
    key: 'minimal-white',
    name: 'Minimal White',
    description: 'Ultra-clean Scandinavian layout focusing on crisp typography and airy whitespace.',
    primaryColor: '#18181B',
    backgroundColor: '#FFFFFF',
    surfaceColor: '#F4F4F5',
    textColor: '#09090B',
    mutedTextColor: '#71717A',
    badgeBg: '#E4E4E7',
    badgeText: '#18181B',
    fontFamily: 'sans',
  },
  'vibrant-cafe': {
    key: 'vibrant-cafe',
    name: 'Vibrant Cafe',
    description: 'Energetic terracotta and coral tones with rounded friendly cards for bistros.',
    primaryColor: '#E05D38',
    backgroundColor: '#FFF8F4',
    surfaceColor: '#FFFFFF',
    textColor: '#2E1911',
    mutedTextColor: '#8C6C5E',
    badgeBg: '#FFE6DC',
    badgeText: '#C0411B',
    fontFamily: 'sans',
  },
};

export const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'CAD', 'AUD', 'SGD'] as const;
