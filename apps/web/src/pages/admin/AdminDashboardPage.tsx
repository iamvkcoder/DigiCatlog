import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Button,
  Input,
  Card,
  Badge,
  Modal,
  Skeleton,
} from '../../components/ui/index.js';
import {
  Store,
  CheckCircle2,
  Ban,
  Clock,
  Plus,
  Copy,
  ExternalLink,
  Sparkles,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { SuperAdminDashboardStats, ShopStatus } from '@digicatlog/shared';
import { Link } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    shopName: string;
    slug: string;
    loginId: string;
    temporaryPassword: string;
  } | null>(null);

  // Form states
  const [shopName, setShopName] = useState('');
  const [slug, setSlug] = useState('');
  const [loginId, setLoginId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<SuperAdminDashboardStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats'),
  });

  // Fetch recent shops
  const { data: shopsData, isLoading: shopsLoading } = useQuery<{ shops: any[] }>({
    queryKey: ['admin-recent-shops'],
    queryFn: () => api.get('/admin/shops'),
  });

  // Auto-generate slug and loginId when typing shopName
  const handleNameChange = (name: string) => {
    setShopName(name);
    const autoSlug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '');
    setSlug(autoSlug);
    setLoginId(autoSlug ? `${autoSlug.replace(/-/g, '_')}_owner` : '');
  };

  // Create shop mutation
  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/admin/shops', payload),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-recent-shops'] });
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });

      setCreatedCredentials({
        shopName: data.shop.name,
        slug: data.shop.slug,
        loginId: data.credentials.loginId,
        temporaryPassword: data.credentials.temporaryPassword,
      });

      // Reset form
      setShopName('');
      setSlug('');
      setLoginId('');
      setExpiresAt('');
      setCreateModalOpen(false);

      toast.success('Shop created successfully!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create shop');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !slug.trim()) return;

    createMutation.mutate({
      name: shopName.trim(),
      slug: slug.trim(),
      loginId: loginId.trim() || undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-cream-950">
            Super Admin Console
          </h1>
          <p className="text-sm text-cream-600 mt-1">
            Global management of multi-tenant restaurant QR catalogs
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setCreateModalOpen(true)}
        >
          Create New Shop
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-cream-600 uppercase tracking-wider">
                  Total Shops
                </p>
                <p className="text-2xl font-bold text-cream-950 mt-0.5">
                  {stats?.totalShops ?? 0}
                </p>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-cream-600 uppercase tracking-wider">
                  Active
                </p>
                <p className="text-2xl font-bold text-emerald-700 mt-0.5">
                  {stats?.activeShops ?? 0}
                </p>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-cream-600 uppercase tracking-wider">
                  Suspended
                </p>
                <p className="text-2xl font-bold text-red-700 mt-0.5">
                  {stats?.suspendedShops ?? 0}
                </p>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-cream-600 uppercase tracking-wider">
                  Expiring in 7 Days
                </p>
                <p className="text-2xl font-bold text-amber-700 mt-0.5">
                  {stats?.expiringIn7Days ?? 0}
                </p>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Recent Shops Preview */}
      <Card className="overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-surface-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-cream-950">
              Recently Created Shops
            </h2>
            <p className="text-xs text-cream-600 mt-0.5">
              Live status and quick management links
            </p>
          </div>
          <Link to="/admin/shops">
            <Button variant="outline" size="sm">
              View All Directory
            </Button>
          </Link>
        </div>

        {shopsLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-border bg-cream-50/70 text-[11px] font-semibold text-cream-600 uppercase tracking-wider">
                  <th className="py-3 px-6">Shop Name</th>
                  <th className="py-3 px-6">Public URL</th>
                  <th className="py-3 px-6">Owner Login ID</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-sm">
                {(shopsData?.shops || []).slice(0, 5).map((shop: any) => (
                  <tr key={shop.id} className="hover:bg-cream-50/40 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-cream-950">
                      {shop.name}
                    </td>
                    <td className="py-3.5 px-6 text-cream-700 font-mono text-xs">
                      <a
                        href={`/m/${shop.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 underline"
                      >
                        /m/{shop.slug}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs text-cream-800">
                      {shop.ownerLoginId || '—'}
                    </td>
                    <td className="py-3.5 px-6">
                      <Badge
                        variant={
                          shop.status === ShopStatus.ACTIVE ? 'success' : 'danger'
                        }
                      >
                        {shop.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Link to="/admin/shops">
                        <Button variant="ghost" size="sm">
                          Manage
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Create Shop */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Restaurant Shop"
        description="Configure tenant details and generate credentials"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 mt-2">
          <Input
            label="Shop / Restaurant Name"
            placeholder="e.g. Bella Italia Bistro"
            value={shopName}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Menu Slug"
            placeholder="e.g. bella-italia"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            required
            helperText="Used in public menu URL: /m/{slug}"
          />

          <Input
            label="Owner Login ID"
            placeholder="Auto-generated"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            helperText="The shop owner uses this ID to access /dashboard"
          />

          <Input
            label="Subscription Expiry (Optional)"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            helperText="Leave empty for unlimited access"
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Create Shop & Credentials
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Credentials Shown ONCE with Copy Button */}
      {createdCredentials && (
        <Modal
          isOpen={true}
          onClose={() => setCreatedCredentials(null)}
          title="Shop Created Successfully!"
          description="Copy and securely share these temporary credentials with the restaurant owner."
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Temporary Password Notice</p>
                <p className="mt-0.5">
                  This temporary password will be shown <strong>only once</strong>. The
                  shop owner must change it upon their very first login.
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-cream-50 p-4 rounded-xl border border-surface-border">
              <div>
                <span className="text-xs font-semibold text-cream-600 uppercase block">
                  Shop Name
                </span>
                <span className="text-sm font-semibold text-cream-950">
                  {createdCredentials.shopName}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-cream-600 uppercase block">
                  Public Menu URL
                </span>
                <span className="text-xs font-mono text-brand-700">
                  {window.location.origin}/m/{createdCredentials.slug}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-cream-600 uppercase block">
                  Owner Login ID
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-sm font-bold text-cream-950">
                    {createdCredentials.loginId}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    onClick={() =>
                      copyToClipboard(createdCredentials.loginId, 'Login ID')
                    }
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-cream-600 uppercase block">
                  Temporary Password
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-sm font-bold text-brand-700 bg-white px-2.5 py-1 rounded-lg border border-surface-border select-all">
                    {createdCredentials.temporaryPassword}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    onClick={() =>
                      copyToClipboard(
                        createdCredentials.temporaryPassword,
                        'Temporary Password'
                      )
                    }
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setCreatedCredentials(null)}
              >
                I Have Saved These Credentials
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
