import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Button,
  Input,
  Select,
  Switch,
  Card,
  Badge,
  Drawer,
  Skeleton,
  EmptyState,
  ConfirmDialog,
} from '../../components/ui/index.js';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Upload,
  Flame,
  ArrowUp,
  ArrowDown,
  UtensilsCrossed,
  Image as ImageIcon,
} from 'lucide-react';
import { ItemDTO, CategoryDTO } from '@digicatlog/shared';

export const ItemsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Drawer & Edit state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemDTO | null>(null);

  // Form states
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState<number | string>('');
  const [formIsVeg, setFormIsVeg] = useState(true);
  const [formSpiceLevel, setFormSpiceLevel] = useState(0);
  const [formTags, setFormTags] = useState('');
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [formImagePublicId, setFormImagePublicId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<ItemDTO | null>(null);

  // Fetch categories
  const { data: categoriesData } = useQuery<{ categories: CategoryDTO[] }>({
    queryKey: ['shop-categories'],
    queryFn: () => api.get('/dashboard/categories'),
  });

  // Fetch items
  const { data: itemsData, isLoading: itemsLoading } = useQuery<{ items: ItemDTO[] }>({
    queryKey: ['shop-items'],
    queryFn: () => api.get('/dashboard/items'),
  });

  const categories = categoriesData?.categories || [];
  const items = itemsData?.items || [];

  // ----------------------------------------------------------------------
  // OPTIMISTIC ONE-TAP AVAILABILITY SWITCH WITH AUTOMATIC ROLLBACK
  // ----------------------------------------------------------------------
  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      api.patch(`/dashboard/items/${id}/availability`, { isAvailable }),

    onMutate: async ({ id, isAvailable }) => {
      // Cancel ongoing queries so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ['shop-items'] });
      const previousData = queryClient.getQueryData<{ items: ItemDTO[] }>(['shop-items']);

      // Optimistically update cache
      if (previousData) {
        queryClient.setQueryData<{ items: ItemDTO[] }>(['shop-items'], {
          items: previousData.items.map((item) =>
            item.id === id ? { ...item, isAvailable } : item
          ),
        });
      }

      return { previousData };
    },

    onError: (err: any, _vars, context) => {
      // Rollback to snapshot on failure
      if (context?.previousData) {
        queryClient.setQueryData(['shop-items'], context.previousData);
      }
      toast.error(err.message || 'Failed to update item availability. Rolled back.');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-items'] });
    },
  });

  // Reorder items mutation
  const reorderMutation = useMutation({
    mutationFn: ({ categoryId, itemIds }: { categoryId: string; itemIds: string[] }) =>
      api.put('/dashboard/items/reorder', { categoryId, itemIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-items'] });
    },
    onError: (err: any) => toast.error(err.message || 'Reorder failed'),
  });

  // Move item up / down within category
  const moveItem = (item: ItemDTO, direction: 'up' | 'down') => {
    const categoryItems = items.filter((i) => i.categoryId === item.categoryId);
    const currentIndex = categoryItems.findIndex((i) => i.id === item.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= categoryItems.length) return;

    const reordered = [...categoryItems];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    reorderMutation.mutate({
      categoryId: item.categoryId,
      itemIds: reordered.map((i) => i.id),
    });
  };

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files (JPEG, PNG, WEBP) are allowed.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image exceeds 3 MB size limit.');
      return;
    }

    setUploadingImage(true);
    try {
      const res = await api.upload<{ url: string; publicId: string }>(
        '/dashboard/upload',
        file,
        'items'
      );
      setFormImageUrl(res.url);
      setFormImagePublicId(res.publicId);
      toast.success('Image uploaded successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Save Item mutation
  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      if (editingItem) {
        return api.put(`/dashboard/items/${editingItem.id}`, payload);
      }
      return api.post('/dashboard/items', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-items'] });
      setIsDrawerOpen(false);
      toast.success(editingItem ? 'Item updated!' : 'Item created!');
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save item.');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/dashboard/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-items'] });
      setItemToDelete(null);
      toast.success('Item deleted successfully.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete item.');
    },
  });

  const resetForm = () => {
    setEditingItem(null);
    setFormCategoryId(categories[0]?.id || '');
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormIsVeg(true);
    setFormSpiceLevel(0);
    setFormTags('');
    setFormIsAvailable(true);
    setFormImageUrl(null);
    setFormImagePublicId(null);
  };

  const openCreateDrawer = () => {
    resetForm();
    setFormCategoryId(categories[0]?.id || '');
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (item: ItemDTO) => {
    setEditingItem(item);
    setFormCategoryId(item.categoryId);
    setFormName(item.name);
    setFormDescription(item.description || '');
    setFormPrice(item.price);
    setFormIsVeg(item.isVeg);
    setFormSpiceLevel(item.spiceLevel);
    setFormTags(item.tags?.join(', ') || '');
    setFormIsAvailable(item.isAvailable);
    setFormImageUrl(item.imageUrl || null);
    setFormImagePublicId(item.imagePublicId || null);
    setIsDrawerOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategoryId || !formName.trim() || formPrice === '') return;

    const payload = {
      categoryId: formCategoryId,
      name: formName.trim(),
      description: formDescription.trim() || null,
      price: Number(formPrice),
      isVeg: formIsVeg,
      spiceLevel: Number(formSpiceLevel),
      tags: formTags
        ? formTags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      isAvailable: formIsAvailable,
      imageUrl: formImageUrl,
      imagePublicId: formImagePublicId,
    };

    saveMutation.mutate(payload);
  };

  // Filtered & grouped items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCategory =
        selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'in_stock' && item.isAvailable) ||
        (availabilityFilter === 'out_of_stock' && !item.isAvailable);
      const matchSearch =
        !searchTerm.trim() ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategory && matchAvailability && matchSearch;
    });
  }, [items, selectedCategory, availabilityFilter, searchTerm]);

  // Group items by category for structured menu management
  const groupedCategories = useMemo(() => {
    const map = new Map<string, { category: CategoryDTO; items: ItemDTO[] }>();

    for (const cat of categories) {
      map.set(cat.id, { category: cat, items: [] });
    }

    for (const item of filteredItems) {
      if (map.has(item.categoryId)) {
        map.get(item.categoryId)!.items.push(item);
      }
    }

    return Array.from(map.values()).filter(
      (group) => selectedCategory !== 'all' || group.items.length > 0 || !searchTerm
    );
  }, [categories, filteredItems, selectedCategory, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-cream-950">
            Menu Items
          </h1>
          <p className="text-sm text-cream-600 mt-1">
            Manage your dishes, adjust instant stock status, and curate photos
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openCreateDrawer}
          disabled={categories.length === 0}
        >
          Add New Item
        </Button>
      </div>

      {categories.length === 0 && !itemsLoading && (
        <Card className="p-6 text-center border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900 mb-2">
            You need at least one category before adding items.
          </p>
          <a href="/dashboard/categories">
            <Button variant="primary" size="sm">
              Create Categories
            </Button>
          </a>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search items by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-medium rounded-xl border border-surface-border bg-white px-3 py-2.5 text-cream-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Availability Filter */}
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="text-xs font-medium rounded-xl border border-surface-border bg-white px-3 py-2.5 text-cream-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Availability</option>
            <option value="in_stock">In Stock Only</option>
            <option value="out_of_stock">Sold Out Only</option>
          </select>
        </div>
      </Card>

      {/* Items List grouped by Category */}
      {itemsLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="w-6 h-6" />}
          title="No menu items found"
          description="Try clearing your search or add a fresh item to your catalog."
          actionLabel="Add Item"
          onAction={openCreateDrawer}
        />
      ) : (
        <div className="space-y-8">
          {groupedCategories.map(({ category, items: catItems }) => {
            if (catItems.length === 0) return null;
            return (
              <div key={category.id} className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                  <h2 className="text-base font-serif font-bold text-cream-950 flex items-center gap-2">
                    <span>{category.name}</span>
                    <span className="text-xs font-sans font-normal text-cream-500">
                      ({catItems.length})
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catItems.map((item, index) => (
                    <Card
                      key={item.id}
                      className={`p-4 sm:p-5 flex gap-4 transition-all ${
                        !item.isAvailable ? 'opacity-60 bg-cream-50/50' : ''
                      }`}
                    >
                      {/* Image Preview */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-cream-100 flex-shrink-0 border border-surface-border relative">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-cream-400">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                        {!item.isAvailable && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white bg-red-600/90 px-1.5 py-0.5 rounded shadow">
                              Sold Out
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-cream-950 truncate flex items-center gap-1.5">
                              <Badge
                                variant={item.isVeg ? 'veg' : 'non-veg'}
                                size="sm"
                              >
                                {item.isVeg ? 'Veg' : 'Non-Veg'}
                              </Badge>
                              <span>{item.name}</span>
                            </h3>
                            <span className="text-sm font-bold text-cream-950">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-xs text-cream-600 line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          )}

                          {/* Spice Level & Tags */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {item.spiceLevel > 0 && (
                              <span
                                className="inline-flex items-center text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium"
                                title={`Spice Level ${item.spiceLevel}/3`}
                              >
                                <Flame className="w-3 h-3 text-red-500 mr-0.5 fill-red-500" />
                                {'🌶️'.repeat(item.spiceLevel)}
                              </span>
                            )}
                            {item.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-medium bg-cream-100 text-cream-700 px-1.5 py-0.5 rounded border border-surface-border"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Bottom Bar: Instant Switch & Reorder / Actions */}
                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-surface-border">
                          {/* One-Tap Availability Toggle */}
                          <div className="flex items-center gap-2">
                            <Switch
                              size="sm"
                              checked={item.isAvailable}
                              onChange={(val) =>
                                toggleMutation.mutate({
                                  id: item.id,
                                  isAvailable: val,
                                })
                              }
                            />
                            <span className="text-xs font-medium text-cream-700">
                              {item.isAvailable ? 'In Stock' : 'Sold Out'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Reorder Buttons */}
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveItem(item, 'up')}
                              className="p-1 rounded text-cream-400 hover:text-cream-800 disabled:opacity-20 transition-colors"
                              title="Move item up"
                              aria-label="Move item up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === catItems.length - 1}
                              onClick={() => moveItem(item, 'down')}
                              className="p-1 rounded text-cream-400 hover:text-cream-800 disabled:opacity-20 transition-colors"
                              title="Move item down"
                              aria-label="Move item down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => openEditDrawer(item)}
                              className="p-1.5 rounded-lg text-cream-600 hover:text-cream-950 hover:bg-cream-100 transition-colors"
                              title="Edit Item"
                              aria-label="Edit Item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => setItemToDelete(item)}
                              className="p-1.5 rounded-lg text-cream-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete Item"
                              aria-label="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer: Add / Edit Item */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
        description="Provide dish description, price, food tags, and upload a photo."
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Select
            label="Category"
            value={formCategoryId}
            onChange={(e) => setFormCategoryId(e.target.value)}
            required
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />

          <Input
            label="Item / Dish Name"
            placeholder="e.g. Truffle Pappardelle"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold text-cream-800 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-surface-border bg-white text-cream-900 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="Describe flavors, key ingredients, and culinary style..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price ($)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-cream-800 uppercase tracking-wider mb-1.5">
                Dietary Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormIsVeg(true)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    formIsVeg
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-warm-sm'
                      : 'bg-white border-surface-border text-cream-600'
                  }`}
                >
                  🟢 Veg
                </button>
                <button
                  type="button"
                  onClick={() => setFormIsVeg(false)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    !formIsVeg
                      ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-warm-sm'
                      : 'bg-white border-surface-border text-cream-600'
                  }`}
                >
                  🔴 Non-Veg
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Spice Level"
              value={formSpiceLevel}
              onChange={(e) => setFormSpiceLevel(Number(e.target.value))}
              options={[
                { value: '0', label: '0 - Not Spicy' },
                { value: '1', label: '1 - Mild 🌶️' },
                { value: '2', label: '2 - Medium 🌶️🌶️' },
                { value: '3', label: '3 - Hot 🌶️🌶️🌶️' },
              ]}
            />

            <Input
              label="Tags (comma-separated)"
              placeholder="e.g. Chef Choice, Truffle"
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
            />
          </div>

          {/* Photo Upload Section */}
          <div>
            <label className="block text-xs font-semibold text-cream-800 uppercase tracking-wider mb-1.5">
              Item Photo (Max 3 MB)
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-cream-100 border border-surface-border flex-shrink-0 flex items-center justify-center">
                {formImageUrl ? (
                  <img
                    src={formImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-cream-400" />
                )}
              </div>
              <div className="flex-1">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-surface-border bg-white hover:bg-cream-50 text-cream-900 shadow-warm-sm transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    </span>
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
                {formImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormImageUrl(null);
                      setFormImagePublicId(null);
                    }}
                    className="block text-xs text-red-600 hover:underline mt-1.5"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Switch
              label="Available in Menu"
              description="Toggle to mark as In Stock or Sold Out instantly"
              checked={formIsAvailable}
              onChange={setFormIsAvailable}
            />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-surface-border flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={saveMutation.isPending}
            >
              {editingItem ? 'Save Changes' : 'Create Item'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Delete Item Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (itemToDelete) {
            deleteMutation.mutate(itemToDelete.id);
          }
        }}
        title={`Delete "${itemToDelete?.name}"?`}
        message="Are you sure you want to delete this menu item? Its image will be permanently removed."
        confirmLabel="Delete Item"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
