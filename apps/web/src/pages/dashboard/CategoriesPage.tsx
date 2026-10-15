import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Button,
  Input,
  Select,
  Switch,
  Card,
  Modal,
  Skeleton,
  EmptyState,
  ConfirmDialog,
} from '../../components/ui/index.js';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  FolderTree,
  AlertTriangle,
} from 'lucide-react';
import { CategoryDTO } from '@digicatlog/shared';

export const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDTO | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryVisible, setCategoryVisible] = useState(true);

  // Delete modal state
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryDTO | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');

  // Fetch categories
  const { data, isLoading } = useQuery<{ categories: CategoryDTO[] }>({
    queryKey: ['shop-categories'],
    queryFn: () => api.get('/dashboard/categories'),
  });

  const categories = data?.categories || [];

  // Create / Update mutation
  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      if (editingCategory) {
        return api.put(`/dashboard/categories/${editingCategory.id}`, payload);
      }
      return api.post('/dashboard/categories', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-categories'] });
      setModalOpen(false);
      toast.success(editingCategory ? 'Category updated!' : 'Category created!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save category.');
    },
  });

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      api.put(`/dashboard/categories/${id}`, { isVisible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-categories'] });
      toast.success('Category visibility updated.');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update visibility'),
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: (categoryIds: string[]) =>
      api.put('/dashboard/categories/reorder', { categoryIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-categories'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to reorder categories'),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, targetId }: { id: string; targetId?: string }) => {
      const q = targetId ? `?targetCategoryId=${targetId}` : '';
      return api.delete(`/dashboard/categories/${id}${q}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-categories'] });
      queryClient.invalidateQueries({ queryKey: ['shop-items'] });
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
      setTargetCategoryId('');
      toast.success('Category deleted successfully.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete category.');
    },
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryVisible(true);
    setModalOpen(true);
  };

  const openEditModal = (cat: CategoryDTO) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryVisible(cat.isVisible);
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    saveMutation.mutate({
      name: categoryName.trim(),
      isVisible: categoryVisible,
    });
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    reorderMutation.mutate(reordered.map((c) => c.id));
  };

  const handleDeleteClick = (cat: CategoryDTO) => {
    setCategoryToDelete(cat);
    const otherCategories = categories.filter((c) => c.id !== cat.id);
    setTargetCategoryId(otherCategories[0]?.id || '');
    setDeleteConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-cream-950">
            Categories
          </h1>
          <p className="text-sm text-cream-600 mt-1">
            Organize and order the sections of your digital menu
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openCreateModal}
        >
          Add Category
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<FolderTree className="w-6 h-6" />}
            title="No categories created"
            description="Create your first section (e.g. Starters, Main Course, Drinks) to start grouping your items."
            actionLabel="Add Category"
            onAction={openCreateModal}
          />
        ) : (
          <div className="divide-y divide-surface-border">
            {categories.map((cat, index) => (
              <div
                key={cat.id}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-cream-50/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveCategory(index, 'up')}
                      className="p-1 rounded text-cream-400 hover:text-cream-800 disabled:opacity-20 transition-colors"
                      title="Move Up"
                      aria-label="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === categories.length - 1}
                      onClick={() => moveCategory(index, 'down')}
                      className="p-1 rounded text-cream-400 hover:text-cream-800 disabled:opacity-20 transition-colors"
                      title="Move Down"
                      aria-label="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-cream-950">
                        {cat.name}
                      </span>
                      {!cat.isVisible && (
                        <span className="text-[10px] font-semibold bg-cream-200 text-cream-700 px-2 py-0.5 rounded-full">
                          Hidden
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-cream-500">
                      {cat.itemCount ?? 0} item(s) inside
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Show/Hide Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    title={cat.isVisible ? 'Hide from public menu' : 'Show on public menu'}
                    onClick={() =>
                      toggleVisibilityMutation.mutate({
                        id: cat.id,
                        isVisible: !cat.isVisible,
                      })
                    }
                  >
                    {cat.isVisible ? (
                      <Eye className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-cream-400" />
                    )}
                  </Button>

                  {/* Rename / Edit */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(cat)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-cream-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteClick(cat)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        description="Categories group your dishes on the public digital menu."
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
          <Input
            label="Category Name"
            placeholder="e.g. Artisanal Pastas, Craft Cocktails"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            required
            autoFocus
          />

          <div className="pt-2">
            <Switch
              label="Visible on Digital Menu"
              description="Keep visible for customers to browse"
              checked={categoryVisible}
              onChange={setCategoryVisible}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saveMutation.isPending}
            >
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Category with Items Protection Modal */}
      {categoryToDelete && (
        <Modal
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          title={`Delete "${categoryToDelete.name}"?`}
          description="Confirm deletion of this category."
        >
          <div className="space-y-4">
            {(categoryToDelete.itemCount ?? 0) > 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs">
                      Category Contains {categoryToDelete.itemCount} Item(s)
                    </p>
                    <p className="text-xs opacity-90 mt-0.5">
                      To prevent accidental loss of your menu items, please select a
                      destination category to safely move these items into before deleting:
                    </p>
                  </div>
                </div>

                <Select
                  label="Move existing items to:"
                  value={targetCategoryId}
                  onChange={(e) => setTargetCategoryId(e.target.value)}
                  options={categories
                    .filter((c) => c.id !== categoryToDelete.id)
                    .map((c) => ({ value: c.id, label: c.name }))}
                />
              </div>
            ) : (
              <p className="text-sm text-cream-600">
                Are you sure you want to delete this empty category?
              </p>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-surface-border">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={deleteMutation.isPending}
                disabled={
                  (categoryToDelete.itemCount ?? 0) > 0 && !targetCategoryId
                }
                onClick={() =>
                  deleteMutation.mutate({
                    id: categoryToDelete.id,
                    targetId: targetCategoryId || undefined,
                  })
                }
              >
                Move & Delete Category
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
