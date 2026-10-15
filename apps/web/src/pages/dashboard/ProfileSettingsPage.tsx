import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Button,
  Input,
  Select,
  Switch,
  Card,
  Skeleton,
} from '../../components/ui/index.js';
import {
  Store,
  Upload,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Instagram,
  Globe,
  Facebook,
  CheckCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { DEFAULT_CURRENCIES, OpeningHours } from '@digicatlog/shared';

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export const ProfileSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery<{ settings: any; shop: any }>({
    queryKey: ['shop-settings'],
    queryFn: () => api.get('/dashboard/settings'),
  });

  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [website, setWebsite] = useState('');

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [openingHours, setOpeningHours] = useState<OpeningHours>({
    monday: { open: '09:00', close: '22:00', isClosed: false },
    tuesday: { open: '09:00', close: '22:00', isClosed: false },
    wednesday: { open: '09:00', close: '22:00', isClosed: false },
    thursday: { open: '09:00', close: '22:00', isClosed: false },
    friday: { open: '09:00', close: '23:00', isClosed: false },
    saturday: { open: '10:00', close: '23:00', isClosed: false },
    sunday: { open: '10:00', close: '21:00', isClosed: false },
  });

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings;
      setPhone(s.phone || '');
      setWhatsapp(s.whatsapp || '');
      setAddress(s.address || '');
      setMapsUrl(s.mapsUrl || '');
      setCurrency(s.currency || 'USD');
      setLogoUrl(s.logoUrl || null);
      setCoverUrl(s.coverUrl || null);

      if (s.socialLinks) {
        setInstagram(s.socialLinks.instagram || '');
        setFacebook(s.socialLinks.facebook || '');
        setWebsite(s.socialLinks.website || '');
      }

      if (s.openingHours) {
        setOpeningHours((prev) => ({ ...prev, ...s.openingHours }));
      }
    }
  }, [data]);

  // Upload handler
  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'cover'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('File size cannot exceed 3 MB.');
      return;
    }

    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingCover;
    setUploading(true);

    try {
      const res = await api.upload<{ url: string; publicId: string }>(
        '/dashboard/upload',
        file,
        type
      );
      if (type === 'logo') setLogoUrl(res.url);
      else setCoverUrl(res.url);
      toast.success(`${type === 'logo' ? 'Logo' : 'Cover image'} uploaded!`);
    } catch (err: any) {
      toast.error(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.put('/dashboard/settings', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-settings'] });
      toast.success('Restaurant profile updated successfully!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update profile');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    saveMutation.mutate({
      phone: phone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      address: address.trim() || null,
      mapsUrl: mapsUrl.trim() || null,
      currency,
      logoUrl,
      coverUrl,
      socialLinks: {
        instagram: instagram.trim() || null,
        facebook: facebook.trim() || null,
        website: website.trim() || null,
      },
      openingHours,
    });
  };

  const updateDaySchedule = (
    day: keyof OpeningHours,
    field: 'open' | 'close' | 'isClosed',
    val: any
  ) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: val,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-cream-950">
          Shop Profile & Details
        </h1>
        <p className="text-sm text-cream-600 mt-1">
          Customize contact information, hours, cover banner, and logo
        </p>
      </div>

      {/* Visual Identity (Cover & Logo) */}
      <Card className="p-6 space-y-6">
        <h2 className="text-sm font-semibold text-cream-950 uppercase tracking-wider">
          Visual Identity
        </h2>

        {/* Cover Photo */}
        <div>
          <label className="block text-xs font-semibold text-cream-800 uppercase tracking-wider mb-2">
            Header Banner Photo (Max 3 MB)
          </label>
          <div className="relative h-44 sm:h-52 w-full rounded-2xl overflow-hidden bg-cream-100 border border-surface-border flex items-center justify-center">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt="Shop Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-4">
                <ImageIcon className="w-8 h-8 text-cream-400 mx-auto mb-2" />
                <p className="text-xs text-cream-500">
                  No cover banner uploaded yet
                </p>
              </div>
            )}
            <div className="absolute bottom-3 right-3">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/95 text-cream-900 shadow-warm hover:bg-white transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {uploadingCover ? 'Uploading...' : 'Change Cover'}
                  </span>
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleUpload(e, 'cover')}
                  disabled={uploadingCover}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-xs font-semibold text-cream-800 uppercase tracking-wider mb-2">
            Restaurant Logo (Square / Circular)
          </label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-cream-100 border-2 border-surface-border flex items-center justify-center flex-shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Shop Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-7 h-7 text-cream-400" />
              )}
            </div>
            <div>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-surface-border bg-white hover:bg-cream-50 text-cream-900 shadow-warm-sm transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleUpload(e, 'logo')}
                  disabled={uploadingLogo}
                />
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Contact & Location */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold text-cream-950 uppercase tracking-wider">
          Contact Information & Direct Ordering
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Phone Number"
            placeholder="+1 (555) 019-2834"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
            helperText="Enables 1-tap phone calls from the menu"
          />

          <Input
            label="WhatsApp Number (with country code)"
            placeholder="+15550192834"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            leftIcon={<MessageCircle className="w-4 h-4" />}
            helperText="Enables 1-tap WhatsApp chat from the menu"
          />
        </div>

        <Input
          label="Physical Address"
          placeholder="e.g. 104 Main Street, Downtown"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          leftIcon={<MapPin className="w-4 h-4" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Google Maps URL"
            placeholder="https://maps.google.com/?q=..."
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            helperText="Opens directions directly in Google Maps"
          />

          <Select
            label="Menu Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={DEFAULT_CURRENCIES.map((c) => ({ value: c, label: c }))}
          />
        </div>
      </Card>

      {/* Opening Hours Schedule */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-cream-950 uppercase tracking-wider">
            Opening Hours (Computes Open/Closed Badge)
          </h2>
        </div>

        <div className="divide-y divide-surface-border">
          {DAYS.map((day) => {
            const sched = openingHours[day] || {
              open: '09:00',
              close: '22:00',
              isClosed: false,
            };
            return (
              <div
                key={day}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="w-28 capitalize font-medium text-sm text-cream-900">
                  {day}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={sched.open}
                      disabled={sched.isClosed}
                      onChange={(e) =>
                        updateDaySchedule(day, 'open', e.target.value)
                      }
                      className="rounded-lg border border-surface-border px-2.5 py-1 text-xs text-cream-900 bg-white disabled:opacity-40"
                    />
                    <span className="text-xs text-cream-500">to</span>
                    <input
                      type="time"
                      value={sched.close}
                      disabled={sched.isClosed}
                      onChange={(e) =>
                        updateDaySchedule(day, 'close', e.target.value)
                      }
                      className="rounded-lg border border-surface-border px-2.5 py-1 text-xs text-cream-900 bg-white disabled:opacity-40"
                    />
                  </div>

                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-cream-700">
                    <input
                      type="checkbox"
                      checked={sched.isClosed}
                      onChange={(e) =>
                        updateDaySchedule(day, 'isClosed', e.target.checked)
                      }
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span>Closed</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Social Links */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold text-cream-950 uppercase tracking-wider">
          Social Links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Instagram URL"
            placeholder="https://instagram.com/..."
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            leftIcon={<Instagram className="w-4 h-4" />}
          />
          <Input
            label="Facebook URL"
            placeholder="https://facebook.com/..."
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            leftIcon={<Facebook className="w-4 h-4" />}
          />
          <Input
            label="Website URL"
            placeholder="https://..."
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            leftIcon={<Globe className="w-4 h-4" />}
          />
        </div>
      </Card>

      {/* Save Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        isLoading={saveMutation.isPending}
        leftIcon={<CheckCircle className="w-4 h-4" />}
      >
        Save Profile Settings
      </Button>
    </form>
  );
};
