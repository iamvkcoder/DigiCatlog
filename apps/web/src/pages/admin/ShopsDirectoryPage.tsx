import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Button,
  Input,
  Select,
  Card,
  Badge,
  Modal,
  Skeleton,
  EmptyState,
  ConfirmDialog,
} from '../../components/ui/index.js';
import {
  Search,
  ExternalLink,
  Ban,
  CheckCircle,
  KeyRound,
  Calendar,
  Copy,
  Store,
  ShieldAlert,
} from 'lucide-react';
import { ShopStatus } from '@digicatlog/shared';

export const ShopsDirectoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [expiryModalOpen, setExpiryModalOpen] = useState(false);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [suspendConfirmOpen, setSuspendConfirmOpen] = useState(false);
  const [resetCredentials, setResetCredentials] = useState<{
    shopName: string;
    loginId: string;
    temporaryPassword: string;
  } | null>(null);

  // Fetch shops
  const { data, isLoading } = useQuery<{ shops: any[] }>({
    queryKey: ['admin-shops', searchTerm, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter) params.set('status', statusFilter);
      return api.get(`/admin/shops?${params.toString()}`);
    },
  });

  // Toggle status mutation (suspend/activate)
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/shops/${id}`, { status }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setSuspendConfirmOpen(false);
      toast.success(
        vars.status === ShopStatus.ACTIVE
          ? 'Shop activated successfully.'
          : 'Shop suspended successfully.'
      );
    },
    onError: (err: any) => toast.error(err.message || 'Status update failed'),
  });

  // Update expiry mutation
  const expiryMutation = useMutation({
    mutationFn: ({ id, expiresAt }: { id: string; expiresAt: string | null }) =>
      api.patch(`/admin/shops/${id}`, { expiresAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
      setExpiryModalOpen(false);
      toast.success('Subscription expiry updated.');
    },
    onError: (err: any) => toast.error(err.message || 'Expiry update failed'),
  });

  // Reset password mutation
  const resetMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/shops/${id}/reset-password`),
    onSuccess: (res: any, id: string) => {
      const shop = data?.shops.find((s) => s.id === id);
      setResetCredentials({
        shopName: shop?.name || 'Shop',
        loginId: res.credentials.loginId,
        temporaryPassword: res.credentials.temporaryPassword,
      });
      toast.success('Password reset successfully.');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to reset password'),
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-cream-950">
          Shops Directory
        </h1>
        <p className="text-sm text-cream-600 mt-1">
          Monitor and administer all registered restaurant tenants
        </p>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by shop name, slug, or owner login ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: ShopStatus.ACTIVE, label: 'Active Only' },
              { value: ShopStatus.SUSPENDED, label: 'Suspended Only' },
            ]}
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : !data?.shops.length ? (
          <EmptyState
            icon={<Store className="w-6 h-6" />}
            title="No shops found"
            description="No shops matched your search filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-border bg-cream-50/70 text-[11px] font-semibold text-cream-600 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Shop Name</th>
                  <th className="py-3.5 px-6">Public Menu</th>
                  <th className="py-3.5 px-6">Owner Login ID</th>
                  <th className="py-3.5 px-6">Catalog</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Expires</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-sm">
                {data.shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-cream-50/40 transition-colors">
                    <td className="py-4 px-6 font-semibold text-cream-950">
                      {shop.name}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-cream-700">
                      <a
                        href={`/m/${shop.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium underline"
                      >
                        /m/{shop.slug}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-cream-800">
                      {shop.ownerLoginId || '—'}
                    </td>
                    <td className="py-4 px-6 text-xs text-cream-600">
                      <span className="font-semibold text-cream-900">
                        {shop.itemCount} items
                      </span>{' '}
                      in {shop.categoryCount} categories ({shop.scanCount} scans)
                    </td>
                    <td className="py-4 px-6">
                      <Badge
                        variant={
                          shop.status === ShopStatus.ACTIVE ? 'success' : 'danger'
                        }
                      >
                        {shop.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-xs text-cream-600">
                      {shop.expiresAt
                        ? new Date(shop.expiresAt).toLocaleDateString()
                        : 'Unlimited'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Suspend / Activate toggle */}
                        {shop.status === ShopStatus.ACTIVE ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            title="Suspend Shop"
                            onClick={() => {
                              setSelectedShop(shop);
                              setSuspendConfirmOpen(true);
                            }}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:bg-emerald-50"
                            title="Activate Shop"
                            onClick={() =>
                              statusMutation.mutate({
                                id: shop.id,
                                status: ShopStatus.ACTIVE,
                              })
                            }
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Set Expiry */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Set Subscription Expiry"
                          onClick={() => {
                            setSelectedShop(shop);
                            setNewExpiryDate(
                              shop.expiresAt
                                ? new Date(shop.expiresAt).toISOString().slice(0, 10)
                                : ''
                            );
                            setExpiryModalOpen(true);
                          }}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </Button>

                        {/* Reset Password */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Generate New Temporary Password"
                          onClick={() => resetMutation.mutate(shop.id)}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Confirm Suspend Dialog */}
      <ConfirmDialog
        isOpen={suspendConfirmOpen}
        onClose={() => setSuspendConfirmOpen(false)}
        onConfirm={() => {
          if (selectedShop) {
            statusMutation.mutate({
              id: selectedShop.id,
              status: ShopStatus.SUSPENDED,
            });
          }
        }}
        title={`Suspend ${selectedShop?.name}?`}
        message="Suspending this shop will immediately hide its public menu card from customers and disable the shop owner dashboard."
        confirmLabel="Suspend Shop"
        isDestructive={true}
        isLoading={statusMutation.isPending}
      />

      {/* Set Expiry Modal */}
      <Modal
        isOpen={expiryModalOpen}
        onClose={() => setExpiryModalOpen(false)}
        title={`Set Expiry for ${selectedShop?.name}`}
        description="Choose a subscription expiration date, or clear to allow unlimited access."
      >
        <div className="space-y-4 mt-2">
          <Input
            label="Expiration Date"
            type="date"
            value={newExpiryDate}
            onChange={(e) => setNewExpiryDate(e.target.value)}
          />

          <div className="flex items-center justify-between pt-4 border-t border-surface-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (selectedShop) {
                  expiryMutation.mutate({ id: selectedShop.id, expiresAt: null });
                }
              }}
            >
              Clear Expiry (Unlimited)
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpiryModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={expiryMutation.isPending}
                onClick={() => {
                  if (selectedShop) {
                    expiryMutation.mutate({
                      id: selectedShop.id,
                      expiresAt: newExpiryDate
                        ? new Date(newExpiryDate).toISOString()
                        : null,
                    });
                  }
                }}
              >
                Save Expiry Date
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal (Shown ONCE with Copy Button) */}
      {resetCredentials && (
        <Modal
          isOpen={true}
          onClose={() => setResetCredentials(null)}
          title="Password Reset Successful"
          description="Copy and share this new temporary password with the shop owner."
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Temporary Password Notice</p>
                <p className="mt-0.5">
                  The shop owner will be required to change this password when they next log in.
                </p>
              </div>
            </div>

            <div className="bg-cream-50 p-4 rounded-xl border border-surface-border space-y-3">
              <div>
                <span className="text-xs font-semibold text-cream-600 uppercase block">
                  Shop Owner Login ID
                </span>
                <span className="font-mono text-sm font-bold text-cream-950">
                  {resetCredentials.loginId}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-cream-600 uppercase block">
                  New Temporary Password
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-sm font-bold text-brand-700 bg-white px-2.5 py-1 rounded-lg border border-surface-border select-all">
                    {resetCredentials.temporaryPassword}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    onClick={() =>
                      copyToClipboard(
                        resetCredentials.temporaryPassword,
                        'Temporary Password'
                      )
                    }
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => setResetCredentials(null)}
            >
              Done
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
