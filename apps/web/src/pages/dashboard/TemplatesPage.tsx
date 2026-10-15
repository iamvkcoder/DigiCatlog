import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { Button, Input, Card, Badge } from '../../components/ui/index.js';
import { TEMPLATES, TemplateKeyType } from '@digicatlog/shared';
import { Check, Sparkles, Smartphone, Eye } from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'Warm Terracotta', hex: '#EA580C' },
  { name: 'Classic Bistro', hex: '#8B4513' },
  { name: 'Forest Emerald', hex: '#059669' },
  { name: 'Midnight Slate', hex: '#0F172A' },
  { name: 'Royal Plum', hex: '#7C3AED' },
  { name: 'Crimson Red', hex: '#DC2626' },
  { name: 'Golden Amber', hex: '#D97706' },
];

export const TemplatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: settingsData } = useQuery<{
    settings: any;
    shop: any;
  }>({
    queryKey: ['shop-settings'],
    queryFn: () => api.get('/dashboard/settings'),
  });

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKeyType>('classic-cream');
  const [brandColor, setBrandColor] = useState('#8B4513');

  useEffect(() => {
    if (settingsData?.settings) {
      if (settingsData.settings.templateKey) {
        setSelectedTemplate(settingsData.settings.templateKey as TemplateKeyType);
      }
      if (settingsData.settings.brandColor) {
        setBrandColor(settingsData.settings.brandColor);
      }
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.put('/dashboard/settings', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-settings'] });
      toast.success('Menu design and brand theme updated!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update template.');
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      templateKey: selectedTemplate,
      brandColor,
    });
  };

  const activeTemplateDef = TEMPLATES[selectedTemplate] || TEMPLATES['classic-cream'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-cream-950">
          Design & Templates
        </h1>
        <p className="text-sm text-cream-600 mt-1">
          Customize the aesthetic experience of your public QR menu
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Template Selection & Brand Colors */}
        <div className="lg:col-span-7 space-y-6">
          {/* Template Choices */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-cream-950 uppercase tracking-wider">
              1. Select a Menu Template
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.values(TEMPLATES).map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.key;
                return (
                  <Card
                    key={tmpl.key}
                    onClick={() => setSelectedTemplate(tmpl.key)}
                    className={`p-4 cursor-pointer transition-all border-2 ${
                      isSelected
                        ? 'border-brand-600 shadow-warm'
                        : 'border-surface-border hover:border-cream-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-cream-950">
                        {tmpl.name}
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-cream-600 mb-3 line-clamp-2">
                      {tmpl.description}
                    </p>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-surface-border">
                      <div
                        className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: tmpl.backgroundColor }}
                        title="Background color"
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: tmpl.surfaceColor }}
                        title="Surface card color"
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: tmpl.primaryColor }}
                        title="Accent color"
                      />
                      <span className="text-[10px] text-cream-500 ml-auto capitalize">
                        {tmpl.fontFamily} font
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Brand Accent Color */}
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-cream-950 uppercase tracking-wider">
              2. Custom Brand Accent Color
            </h2>
            <p className="text-xs text-cream-600">
              This color highlights active category tabs, dietary pills, and checkout buttons.
            </p>

            {/* Presets */}
            <div className="flex flex-wrap gap-2.5">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setBrandColor(preset.hex)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    brandColor.toLowerCase() === preset.hex.toLowerCase()
                      ? 'border-cream-950 bg-cream-100 shadow-warm-sm'
                      : 'border-surface-border hover:bg-cream-50'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>

            {/* Custom Hex Input */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-surface-border p-0.5 bg-white"
                title="Choose custom color"
              />
              <Input
                label="Hex Code"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                placeholder="#EA580C"
                className="w-36 font-mono"
              />
            </div>
          </Card>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleSave}
            isLoading={saveMutation.isPending}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Apply & Save Design
          </Button>
        </div>

        {/* Right Column: Live Phone Mockup Preview */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="text-center mb-3">
            <span className="text-xs font-semibold text-cream-700 uppercase tracking-wider inline-flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-brand-600" />
              Live Phone Mockup
            </span>
          </div>

          {/* Mobile Chassis Frame */}
          <div className="w-[320px] h-[640px] rounded-[2.5rem] p-3 bg-neutral-900 shadow-warm-lg border-4 border-neutral-800 relative flex flex-col overflow-hidden">
            {/* Speaker & notch */}
            <div className="w-24 h-4 bg-neutral-800 rounded-full mx-auto mb-2 flex-shrink-0" />

            {/* Screen Content Simulated */}
            <div
              className="flex-1 rounded-[1.8rem] overflow-y-auto flex flex-col transition-colors duration-300 no-scrollbar"
              style={{
                backgroundColor: activeTemplateDef.backgroundColor,
                color: activeTemplateDef.textColor,
                fontFamily:
                  activeTemplateDef.fontFamily === 'serif'
                    ? 'Playfair Display, Georgia, serif'
                    : 'Inter, sans-serif',
              }}
            >
              {/* Header Image Cover */}
              <div
                className="h-28 w-full bg-cover bg-center relative flex-shrink-0"
                style={{
                  backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80')`,
                }}
              >
                <div className="absolute inset-0 bg-black/30" />
              </div>

              {/* Restaurant Header */}
              <div className="p-4 pt-0 -mt-6 relative flex-1 flex flex-col">
                <div className="flex items-end gap-3 mb-2">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white shadow-warm bg-white flex-shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=150&q=80"
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 inline-block mb-1">
                      Open Now
                    </span>
                    <h3 className="text-base font-bold leading-tight">
                      {settingsData?.shop?.name || 'Bella Italia'}
                    </h3>
                  </div>
                </div>

                {/* Simulated Sticky Tabs */}
                <div className="flex gap-2 py-2 overflow-x-auto no-scrollbar border-b border-black/10 mb-3">
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full text-white flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: brandColor }}
                  >
                    Starters
                  </span>
                  <span
                    className="text-xs font-medium px-3 py-1 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: activeTemplateDef.badgeBg,
                      color: activeTemplateDef.badgeText,
                    }}
                  >
                    Pastas
                  </span>
                  <span
                    className="text-xs font-medium px-3 py-1 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: activeTemplateDef.badgeBg,
                      color: activeTemplateDef.badgeText,
                    }}
                  >
                    Desserts
                  </span>
                </div>

                {/* Item Card 1 */}
                <div
                  className="p-3 rounded-xl border border-black/5 shadow-sm mb-2.5"
                  style={{ backgroundColor: activeTemplateDef.surfaceColor }}
                >
                  <div className="flex gap-2.5">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                        Veg
                      </span>
                      <h4 className="text-xs font-bold mt-1 truncate">
                        Tuscan Bruschetta
                      </h4>
                      <p
                        className="text-[10px] mt-0.5 line-clamp-2"
                        style={{ color: activeTemplateDef.mutedTextColor }}
                      >
                        Garlic rubbed ciabatta, heirloom tomatoes, fresh basil.
                      </p>
                      <span
                        className="text-xs font-bold block mt-1.5"
                        style={{ color: brandColor }}
                      >
                        $12.50
                      </span>
                    </div>
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-cream-200 flex-shrink-0">
                      <img
                        src="https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=200&q=80"
                        alt="Dish"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Item Card 2 (Sold out badge) */}
                <div
                  className="p-3 rounded-xl border border-black/5 shadow-sm opacity-60"
                  style={{ backgroundColor: activeTemplateDef.surfaceColor }}
                >
                  <div className="flex gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Veg
                        </span>
                        <span className="text-[9px] font-bold text-white bg-red-600 px-1 py-0.5 rounded">
                          Sold Out
                        </span>
                      </div>
                      <h4 className="text-xs font-bold mt-1 truncate">
                        Wild Mushroom Gnocchi
                      </h4>
                      <span className="text-xs font-bold block mt-1">
                        $24.00
                      </span>
                    </div>
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-cream-200 flex-shrink-0">
                      <img
                        src="https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=200&q=80"
                        alt="Dish"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
