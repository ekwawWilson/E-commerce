'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Loader2, FolderTree, X, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AdminHeader } from '@/components/admin/header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/lib/api/admin';
import { Category } from '@/types';

interface CategoryFormData {
  name: string;
  description: string;
  parentId: string;
  image: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    parentId: '',
    image: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
        // Flatten for parent selection
        const flat = flattenCategories(response.data);
        setFlatCategories(flat);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const flattenCategories = (cats: Category[], level = 0): Category[] => {
    const result: Category[] = [];
    for (const cat of cats) {
      result.push({ ...cat, name: '  '.repeat(level) + cat.name });
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, level + 1));
      }
    }
    return result;
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        parentId: category.parentId || '',
        image: category.image || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', parentId: '', image: '' });
    }
    setPendingFile(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', parentId: '', image: '' });
    setPendingFile(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For new categories, store file for later upload and show preview
    if (!editingCategory) {
      const previewUrl = URL.createObjectURL(file);
      setFormData({ ...formData, image: previewUrl });
      setPendingFile(file);
      return;
    }

    // For existing categories, upload immediately
    setIsUploadingImage(true);
    try {
      const response = await adminApi.uploadCategoryImage(editingCategory.id, file);
      if (response.success && response.data) {
        setFormData({ ...formData, image: response.data.image.url });
        setEditingCategory({ ...editingCategory, image: response.data.image.url });
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!editingCategory) {
      // Just remove the preview for new categories
      setFormData({ ...formData, image: '' });
      setPendingFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploadingImage(true);
    try {
      await adminApi.deleteCategoryImage(editingCategory.id);
      setFormData({ ...formData, image: '' });
      setEditingCategory({ ...editingCategory, image: null });
    } catch (error) {
      console.error('Failed to delete image:', error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = {
        name: formData.name,
        description: formData.description || undefined,
        parentId: formData.parentId || undefined,
      };

      if (editingCategory) {
        await adminApi.updateCategory(editingCategory.id, data);
      } else {
        // Create category first
        const response = await adminApi.createCategory(data);

        // If we have a pending file, upload it
        if (pendingFile && response.success && response.data) {
          await adminApi.uploadCategoryImage(response.data.id, pendingFile);
        }
      }

      handleCloseDialog();
      fetchCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    setIsSubmitting(true);
    try {
      await adminApi.deleteCategory(deletingCategory.id);
      setIsDeleteDialogOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCategoryRows = (cats: Category[], level = 0): React.ReactNode => {
    return cats.map((category) => (
      <>
        <TableRow key={category.id}>
          <TableCell>
            <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 24}px` }}>
              {level > 0 && <span className="text-muted-foreground">└</span>}
              {category.image ? (
                <div className="relative h-10 w-10 overflow-hidden rounded-md border">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                  <FolderTree className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <span className="font-medium">{category.name}</span>
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">
            {category.slug}
          </TableCell>
          <TableCell className="max-w-xs truncate text-muted-foreground">
            {category.description || '-'}
          </TableCell>
          <TableCell>
            {category.children?.length || 0} subcategories
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenDialog(category)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDeletingCategory(category);
                  setIsDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {category.children && category.children.length > 0 && renderCategoryRows(category.children, level + 1)}
      </>
    ));
  };

  return (
    <div className="flex flex-col">
      <AdminHeader title="Categories" />

      <div className="p-6">
        {/* Actions Bar */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-muted-foreground">
            Manage product categories and subcategories
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>

        {/* Categories Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Children</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No categories found. Create your first category.
                  </TableCell>
                </TableRow>
              ) : (
                renderCategoryRows(categories)
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category details below.'
                : 'Fill in the details to create a new category.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Category Image</Label>
              <div className="flex items-start gap-4">
                {formData.image ? (
                  <div className="relative">
                    <div className="relative h-24 w-24 overflow-hidden rounded-lg border">
                      <Image
                        src={formData.image}
                        alt="Category image"
                        fill
                        className="object-cover"
                        unoptimized={formData.image.startsWith('blob:')}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6"
                      onClick={handleRemoveImage}
                      disabled={isUploadingImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-muted-foreground/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploadingImage ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Upload</span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <div className="flex-1 text-sm text-muted-foreground">
                  <p>Upload an image for this category.</p>
                  <p className="mt-1">Recommended: 200x200px, JPG or PNG</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Category name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentId">Parent Category</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) =>
                  setFormData({ ...formData, parentId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top-level)</SelectItem>
                  {flatCategories
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploadingImage}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingCategory ? 'Updating...' : 'Creating...'}
                  </>
                ) : editingCategory ? (
                  'Update Category'
                ) : (
                  'Create Category'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingCategory?.name}&quot;?
              {deletingCategory?.children && deletingCategory.children.length > 0 && (
                <span className="mt-2 block text-destructive">
                  Warning: This category has {deletingCategory.children.length} subcategories that will also be affected.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingCategory(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
