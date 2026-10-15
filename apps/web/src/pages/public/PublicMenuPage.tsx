import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api.js';
import {
  TEMPLATES,
  PublicMenuResponse,
  TemplateDefinition,
} from '@digicatlog/shared';
import {
  Phone,
  MessageCircle,
  MapPin,
  Search,
  Flame,
  Clock,
  AlertCircle,
  Store,
  ExternalLink,
} from 'lucide-react';

function optimizeImageUrl(url?: string | null, width = 400): string | undefined {
  if (!url) return undefined;
  if (url.includes('res.cloudinary.com')) {
    // Inject Cloudinary transformations
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
  }
  return url;
}

export const PublicMenuPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [searchTerm, setSearchTerm] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  // Fetch Public Menu
  const { data, isLoading, error } = useQuery<PublicMenuResponse>({
    queryKey: ['public-menu', slug],
    queryFn: () => api.get(`/public/menu/${slug}`),
    enabled: Boolean(slug),
    staleTime: 0,
    retry: false,
  });

  // Record QR Scan once per session
  useEffect(() => {
    if (slug) {
      const scanKey = `scanned_${slug}`;
      if (!sessionStorage.getItem(scanKey)) {
        api.post(`/public/menu/${slug}/scan`).catch(() => {});
        sessionStorage.setItem(scanKey, '1');
      }
    }
  }, [slug]);

  // Set default active category
  useEffect(() => {
    if (data?.categories.length && !activeCategory) {
      setActiveCategory(data.categories[0].id);
    }
  }, [data, activeCategory]);

  // Scroll spy effect with IntersectionObserver
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 160;
      for (const cat of data?.categories || []) {
        const el = categoryRefs.current[cat.id];
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveCategory(cat.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [data]);

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    const el = categoryRefs.current[id];
    if (el) {
      const topOffset = el.getBoundingClientRect().top + window.pageYOffset - 120;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    }
  };

  // Filter items
  const filteredCategories = useMemo(() => {
    if (!data?.categories) return [];

    return data.categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => {
          const matchVeg = vegOnly ? item.isVeg : true;
          const matchSearch =
            !searchTerm.trim() ||
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
          return matchVeg && matchSearch;
        }),
      }))
      .filter((cat) => cat.items.length > 0 || !searchTerm);
  }, [data, vegOnly, searchTerm]);

  // Error States (Suspended, Expired, Not Found)
  if (error) {
    const apiErr = error as ApiError;
    const isSuspended = apiErr.code === 'SHOP_SUSPENDED';
    const isExpired = apiErr.code === 'SHOP_EXPIRED';
    const isNotFound = apiErr.code === 'NOT_FOUND' || apiErr.statusCode === 404;

    return (
      <div className="min-h-screen bg-[#FDFCF7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 shadow-warm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-[#2D241E] mb-2">
          {isNotFound
            ? 'Menu Not Found'
            : isSuspended
            ? 'Menu Currently Unavailable'
            : isExpired
            ? 'Menu Subscription Expired'
            : 'Unable to Load Menu'}
        </h1>
        <p className="text-sm text-[#7D7065] max-w-md mb-6">
          {apiErr.message ||
            'This digital menu is temporarily unavailable. Please request a physical card or check with your server.'}
        </p>
        <div className="text-xs font-semibold uppercase tracking-wider text-[#A6895C]">
          DIGICATLOG Digital Menu Platform
        </div>
      </div>
    );
  }

  // Loading Skeleton
  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] max-w-lg mx-auto pb-12 animate-pulse">
        <div className="h-44 bg-cream-200" />
        <div className="p-4 space-y-4 -mt-10">
          <div className="flex gap-3 items-end">
            <div className="w-20 h-20 rounded-2xl bg-cream-300 border-4 border-white shadow" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 bg-cream-300 rounded" />
              <div className="h-6 w-48 bg-cream-300 rounded" />
            </div>
          </div>
          <div className="h-10 bg-cream-200 rounded-xl" />
          <div className="h-28 bg-cream-200 rounded-2xl" />
          <div className="h-28 bg-cream-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { shop } = data;
  const templateKey = shop.templateKey || 'classic-cream';
  const template: TemplateDefinition =
    TEMPLATES[templateKey] || TEMPLATES['classic-cream'];
  const brandColor = shop.brandColor || template.primaryColor;

  return (
    <div
      className="min-h-screen transition-colors duration-200 antialiased"
      style={{
        backgroundColor: template.backgroundColor,
        color: template.textColor,
        fontFamily:
          template.fontFamily === 'serif'
            ? 'Playfair Display, Georgia, serif'
            : 'Inter, -apple-system, sans-serif',
      }}
    >
      <div className="max-w-lg mx-auto pb-16 flex flex-col min-h-screen relative shadow-warm-lg">
        {/* Cover Banner */}
        <div className="h-44 sm:h-52 w-full relative bg-cream-200 overflow-hidden flex-shrink-0">
          {shop.coverUrl ? (
            <img
              src={optimizeImageUrl(shop.coverUrl, 800)}
              alt={shop.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                backgroundColor: brandColor,
                opacity: 0.15,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        </div>

        {/* Restaurant Header */}
        <div className="px-4 sm:px-6 -mt-10 relative z-10 space-y-4">
          <div className="flex items-end gap-3.5">
            {/* Logo */}
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden border-4 shadow-warm-md flex items-center justify-center flex-shrink-0"
              style={{
                borderColor: template.surfaceColor,
                backgroundColor: template.surfaceColor,
              }}
            >
              {shop.logoUrl ? (
                <img
                  src={optimizeImageUrl(shop.logoUrl, 200)}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store
                  className="w-8 h-8"
                  style={{ color: brandColor }}
                />
              )}
            </div>

            {/* Restaurant Title & Open Status */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    shop.isOpenNow
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-neutral-200 text-neutral-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      shop.isOpenNow ? 'bg-emerald-600' : 'bg-neutral-500'
                    }`}
                  />
                  {shop.isOpenNow ? 'Open Now' : 'Closed'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug truncate">
                {shop.name}
              </h1>
            </div>
          </div>

          {/* Address */}
          {shop.address && (
            <p
              className="text-xs line-clamp-2"
              style={{ color: template.mutedTextColor }}
            >
              {shop.address}
            </p>
          )}

          {/* Quick Action Buttons (Call, WhatsApp, Maps) */}
          <div className="flex items-center gap-2 pt-1">
            {shop.phone && (
              <a
                href={`tel:${shop.phone}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold border shadow-sm transition-transform active:scale-95"
                style={{
                  backgroundColor: template.surfaceColor,
                  borderColor: 'rgba(0,0,0,0.08)',
                  color: template.textColor,
                }}
              >
                <Phone className="w-3.5 h-3.5" style={{ color: brandColor }} />
                <span>Call</span>
              </a>
            )}

            {shop.whatsapp && (
              <a
                href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold border shadow-sm transition-transform active:scale-95"
                style={{
                  backgroundColor: template.surfaceColor,
                  borderColor: 'rgba(0,0,0,0.08)',
                  color: template.textColor,
                }}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </a>
            )}

            {shop.mapsUrl && (
              <a
                href={shop.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold border shadow-sm transition-transform active:scale-95"
                style={{
                  backgroundColor: template.surfaceColor,
                  borderColor: 'rgba(0,0,0,0.08)',
                  color: template.textColor,
                }}
              >
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>Directions</span>
              </a>
            )}
          </div>
        </div>

        {/* Sticky Filters & Category Bar */}
        <div
          className="sticky top-0 z-30 pt-3 pb-2 px-4 sm:px-6 backdrop-blur-md shadow-sm border-b transition-colors"
          style={{
            backgroundColor: `${template.backgroundColor}E6`, // 90% opacity for blur
            borderColor: 'rgba(0,0,0,0.06)',
          }}
        >
          {/* Search & Veg Filter */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40"
              />
              <input
                type="text"
                placeholder="Search dishes or ingredients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs rounded-xl py-2 pl-9 pr-3 border focus:outline-none transition-all shadow-sm"
                style={{
                  backgroundColor: template.surfaceColor,
                  borderColor: 'rgba(0,0,0,0.1)',
                  color: template.textColor,
                }}
              />
            </div>

            {/* Pure Veg Switch Button */}
            <button
              type="button"
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all flex-shrink-0 shadow-sm ${
                vegOnly
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-emerald-500/40 text-emerald-700 bg-emerald-50/70'
              }`}
            >
              <span>🟢</span>
              <span>Veg Only</span>
            </button>
          </div>

          {/* Category Tabs (Horizontal Scrollable) */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {data.categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => scrollToCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 select-none ${
                    isActive ? 'shadow-sm text-white scale-[1.02]' : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? brandColor : template.badgeBg,
                    color: isActive ? '#FFFFFF' : template.badgeText,
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Items Container */}
        <div className="px-4 sm:px-6 pt-5 space-y-8 flex-1">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-16">
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: template.textColor }}
              >
                No matching dishes found
              </p>
              <p
                className="text-xs"
                style={{ color: template.mutedTextColor }}
              >
                Try clearing your search query or toggling Veg Only off.
              </p>
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <section
                key={cat.id}
                ref={(el) => (categoryRefs.current[cat.id] = el)}
                className="space-y-3 pt-2"
              >
                <h2 className="text-base font-bold tracking-tight border-b pb-1.5 flex items-center justify-between border-black/10">
                  <span>{cat.name}</span>
                  <span
                    className="text-xs font-normal"
                    style={{ color: template.mutedTextColor }}
                  >
                    {cat.items.length} dishes
                  </span>
                </h2>

                <div className="space-y-3">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border shadow-sm flex gap-3 transition-all ${
                        !item.isAvailable ? 'opacity-50 grayscale-[40%]' : ''
                      }`}
                      style={{
                        backgroundColor: template.surfaceColor,
                        borderColor: 'rgba(0,0,0,0.06)',
                      }}
                    >
                      {/* Left: Text & Badges */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            {/* Veg / Non-Veg Indicator */}
                            <span
                              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                                item.isVeg
                                  ? 'border-emerald-600 bg-emerald-50'
                                  : 'border-rose-600 bg-rose-50'
                              }`}
                              title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                                }`}
                              />
                            </span>

                            {/* Spice indicator */}
                            {item.spiceLevel > 0 && (
                              <span className="text-[10px] text-amber-600 inline-flex items-center font-bold">
                                {'🌶️'.repeat(item.spiceLevel)}
                              </span>
                            )}

                            {!item.isAvailable && (
                              <span className="text-[10px] font-bold text-white bg-red-600 px-1.5 py-0.2 rounded shadow-sm">
                                Sold Out
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold leading-snug">
                            {item.name}
                          </h3>

                          {item.description && (
                            <p
                              className="text-xs line-clamp-2 mt-1 leading-relaxed"
                              style={{ color: template.mutedTextColor }}
                            >
                              {item.description}
                            </p>
                          )}

                          {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {item.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] font-medium px-1.5 py-0.5 rounded border border-black/5 opacity-80"
                                  style={{
                                    backgroundColor: template.badgeBg,
                                    color: template.badgeText,
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Price */}
                        <div className="mt-2 pt-1 font-bold text-sm">
                          <span style={{ color: brandColor }}>
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Lazy Image with Cloudinary Transforms */}
                      {item.imageUrl && (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-black/5 flex-shrink-0 border border-black/5 relative">
                          <img
                            src={optimizeImageUrl(item.imageUrl, 250)}
                            alt={item.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          {!item.isAvailable && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white bg-red-600/90 px-1.5 py-0.5 rounded">
                                Sold Out
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Footer */}
        <footer className="mt-auto pt-10 text-center pb-6">
          <p
            className="text-[11px] font-medium tracking-wider uppercase opacity-60"
            style={{ color: template.mutedTextColor }}
          >
            Powered by DIGICATLOG Digital QR Menu
          </p>
        </footer>
      </div>
    </div>
  );
};

export default PublicMenuPage;
