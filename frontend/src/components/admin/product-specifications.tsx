'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
}

export interface ProductSpecification {
  key: string;
  value: string;
  group?: string;
}

interface ProductSpecificationsProps {
  specifications: ProductSpecification[];
  onChange: (specifications: ProductSpecification[]) => void;
}

export function ProductSpecifications({
  specifications,
  onChange,
}: ProductSpecificationsProps) {
  const [templates, setTemplates] = useState<SpecificationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await adminApi.getSpecificationTemplates();
        if (response.success && response.data) {
          // Handle both array and object with items property
          const data = Array.isArray(response.data)
            ? response.data
            : response.data.items || [];
          setTemplates(data);
        }
      } catch (error) {
        console.error('Failed to fetch specification templates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.group]) {
      acc[template.group] = [];
    }
    acc[template.group].push(template);
    return acc;
  }, {} as Record<string, SpecificationTemplate[]>);

  const addSpecification = () => {
    if (!selectedTemplate) return;

    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;

    // Check if already added
    if (specifications.some((s) => s.key === template.key)) {
      return;
    }

    onChange([
      ...specifications,
      {
        key: template.key,
        value: '',
        group: template.group,
      },
    ]);
    setSelectedTemplate('');
  };

  const addCustomSpecification = () => {
    const newKey = `custom_${Date.now()}`;
    onChange([
      ...specifications,
      {
        key: newKey,
        value: '',
        group: 'Custom',
      },
    ]);
  };

  const updateSpecification = (index: number, value: string) => {
    const updated = [...specifications];
    updated[index] = { ...updated[index], value };
    onChange(updated);
  };

  const updateCustomKey = (index: number, key: string) => {
    const updated = [...specifications];
    updated[index] = { ...updated[index], key: key.toLowerCase().replace(/\s+/g, '_') };
    onChange(updated);
  };

  const removeSpecification = (index: number) => {
    onChange(specifications.filter((_, i) => i !== index));
  };

  const getTemplateByKey = (key: string) => {
    return templates.find((t) => t.key === key);
  };

  const getAvailableTemplates = () => {
    const usedKeys = new Set(specifications.map((s) => s.key));
    return templates.filter((t) => !usedKeys.has(t.key));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add from template */}
      <div className="flex gap-2">
        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select specification to add..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(groupedTemplates).map(([group, groupTemplates]) => {
              const available = groupTemplates.filter(
                (t) => !specifications.some((s) => s.key === t.key)
              );
              if (available.length === 0) return null;
              return (
                <SelectGroup key={group}>
                  <SelectLabel>{group}</SelectLabel>
                  {available.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                      {template.required && (
                        <span className="ml-1 text-destructive">*</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
        <Button type="button" onClick={addSpecification} disabled={!selectedTemplate}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Custom specification button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addCustomSpecification}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Custom Specification
      </Button>

      {/* Specification list */}
      {specifications.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No specifications added yet. Select from templates or add custom ones.
        </p>
      ) : (
        <div className="space-y-3">
          {specifications.map((spec, index) => {
            const template = getTemplateByKey(spec.key);
            const isCustom = !template || spec.key.startsWith('custom_');

            return (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  {isCustom ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Key</Label>
                        <Input
                          value={spec.key.startsWith('custom_') ? '' : spec.key.replace(/_/g, ' ')}
                          onChange={(e) => updateCustomKey(index, e.target.value)}
                          placeholder="specification_key"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Value</Label>
                        <Input
                          value={spec.value}
                          onChange={(e) => updateSpecification(index, e.target.value)}
                          placeholder="Value"
                          className="h-9"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-xs">
                        {template?.label || spec.key}
                        {template?.required && (
                          <span className="ml-1 text-destructive">*</span>
                        )}
                      </Label>
                      {template?.type === 'select' && template.options ? (
                        <Select
                          value={spec.value}
                          onValueChange={(value) => updateSpecification(index, value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={`Select ${template.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {template.options.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={template?.type === 'number' ? 'number' : 'text'}
                          value={spec.value}
                          onChange={(e) => updateSpecification(index, e.target.value)}
                          placeholder={`Enter ${template?.label || spec.key}`}
                          className="h-9"
                        />
                      )}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-5 h-9 w-9 shrink-0"
                  onClick={() => removeSpecification(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      {templates.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No specification templates defined. Create templates in Settings {'->'} Specifications.
        </p>
      )}
    </div>
  );
}
