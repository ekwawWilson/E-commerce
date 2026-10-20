'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, List, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

interface SpecificationTemplate {
  id: string;
  key: string;
  label: string;
  group: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  required: boolean;
  sortOrder: number;
  createdAt: string;
}

interface SpecFormData {
  key: string;
  label: string;
  group: string;
  type: 'text' | 'number' | 'select';
  options: string;
  required: boolean;
}

const specGroups = [
  'General',
  'Technical',
  'Physical',
  'Display',
  'Storage',
  'Connectivity',
  'Battery',
  'Camera',
  'Other',
];

export default function SpecificationsPage() {
  const [specifications, setSpecifications] = useState<SpecificationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<SpecificationTemplate | null>(null);
  const [deletingSpec, setDeletingSpec] = useState<SpecificationTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SpecFormData>({
    key: '',
    label: '',
    group: 'General',
    type: 'text',
    options: '',
    required: false,
  });

  const fetchSpecifications = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getSpecificationTemplates() as {
        success: boolean;
        data: SpecificationTemplate[];
      };
      if (response.success) {
        setSpecifications(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch specifications:', error);
      setSpecifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecifications();
  }, []);

  const filteredSpecs = specifications.filter((spec) => {
    const matchesSearch =
      spec.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spec.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = groupFilter === 'all' || spec.group === groupFilter;
    return matchesSearch && matchesGroup;
  });

  const groupedSpecs = filteredSpecs.reduce((acc, spec) => {
    if (!acc[spec.group]) {
      acc[spec.group] = [];
    }
    acc[spec.group].push(spec);
    return acc;
  }, {} as Record<string, SpecificationTemplate[]>);

  const handleOpenDialog = (spec?: SpecificationTemplate) => {
    if (spec) {
      setEditingSpec(spec);
      setFormData({
        key: spec.key,
        label: spec.label,
        group: spec.group,
        type: spec.type,
        options: spec.options?.join(', ') || '',
        required: spec.required,
      });
    } else {
      setEditingSpec(null);
      setFormData({
        key: '',
        label: '',
        group: 'General',
        type: 'text',
        options: '',
        required: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSpec(null);
    setFormData({
      key: '',
      label: '',
      group: 'General',
      type: 'text',
      options: '',
      required: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = {
        key: formData.key.toLowerCase().replace(/\s+/g, '_'),
        label: formData.label,
        group: formData.group,
        type: formData.type,
        options: formData.type === 'select'
          ? formData.options.split(',').map(o => o.trim()).filter(Boolean)
          : undefined,
        required: formData.required,
      };

      if (editingSpec) {
        await adminApi.updateSpecificationTemplate(editingSpec.id, data);
      } else {
        await adminApi.createSpecificationTemplate(data);
      }

      handleCloseDialog();
      fetchSpecifications();
    } catch (error) {
      console.error('Failed to save specification:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSpec) return;

    setIsSubmitting(true);
    try {
      await adminApi.deleteSpecificationTemplate(deletingSpec.id);
      setIsDeleteDialogOpen(false);
      setDeletingSpec(null);
      fetchSpecifications();
    } catch (error) {
      console.error('Failed to delete specification:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <AdminHeader title="Specification Templates" />

      <div className="p-6">
        {/* Actions Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search specifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {specGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Specification
          </Button>
        </div>

        {/* Info Card */}
        <div className="mb-6 rounded-lg border bg-blue-50 p-4 dark:bg-blue-950">
          <h3 className="font-medium text-blue-900 dark:text-blue-100">
            About Specification Templates
          </h3>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
            Specification templates define the attributes that can be added to products.
            Create templates here, then assign them when creating or editing products.
          </p>
        </div>

        {/* Specifications Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : filteredSpecs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No specification templates found. Create your first one.
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(groupedSpecs).map(([group, specs]) => (
                  <React.Fragment key={group}>
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={6} className="font-medium">
                        <div className="flex items-center gap-2">
                          <List className="h-4 w-4" />
                          {group}
                          <Badge variant="secondary" className="ml-2">
                            {specs.length}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                    {specs.map((spec) => (
                      <TableRow key={spec.id}>
                        <TableCell>
                          <code className="rounded bg-muted px-2 py-1 text-sm">
                            {spec.key}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">{spec.label}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{spec.group}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              spec.type === 'select'
                                ? 'default'
                                : spec.type === 'number'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {spec.type}
                          </Badge>
                          {spec.type === 'select' && spec.options && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({spec.options.length} options)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {spec.required ? (
                            <Badge variant="destructive">Required</Badge>
                          ) : (
                            <span className="text-muted-foreground">Optional</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(spec)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeletingSpec(spec);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
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
              {editingSpec ? 'Edit Specification' : 'Create Specification'}
            </DialogTitle>
            <DialogDescription>
              {editingSpec
                ? 'Update the specification template details.'
                : 'Create a new specification template for products.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    label: e.target.value,
                    key: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                  });
                }}
                placeholder="e.g., Screen Size"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    key: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                  })
                }
                placeholder="e.g., screen_size"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from label. Used as identifier.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="group">Group</Label>
                <Select
                  value={formData.group}
                  onValueChange={(value) =>
                    setFormData({ ...formData, group: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {specGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'text' | 'number' | 'select') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Select (Dropdown)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === 'select' && (
              <div className="space-y-2">
                <Label htmlFor="options">Options (comma-separated)</Label>
                <Input
                  id="options"
                  value={formData.options}
                  onChange={(e) =>
                    setFormData({ ...formData, options: e.target.value })
                  }
                  placeholder="e.g., Small, Medium, Large"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                checked={formData.required}
                onChange={(e) =>
                  setFormData({ ...formData, required: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="required" className="font-normal">
                Required for all products
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingSpec ? 'Updating...' : 'Creating...'}
                  </>
                ) : editingSpec ? (
                  'Update'
                ) : (
                  'Create'
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
            <DialogTitle>Delete Specification</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the "{deletingSpec?.label}" specification template?
              This will not affect existing products that already have this specification.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingSpec(null);
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
