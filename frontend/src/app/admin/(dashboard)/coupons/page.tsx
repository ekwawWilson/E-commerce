'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { AdminHeader } from '@/components/admin/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/lib/api/admin';
import { formatPrice } from '@/lib/utils';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED';
  value: string | number;
  minSubtotal: string | number | null;
  maxDiscount: string | number | null;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
}

const emptyForm = {
  code: '',
  description: '',
  type: 'PERCENTAGE' as Coupon['type'],
  value: '',
  minSubtotal: '',
  maxDiscount: '',
  usageLimit: '',
  startsAt: '',
  endsAt: '',
};

// Empty inputs become null so optional limits are cleared, not sent as ""
const numberOrNull = (v: string) => (v.trim() === '' ? null : Number(v));
const dateOrNull = (v: string) => (v ? new Date(v).toISOString() : null);

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const response = await adminApi.getCoupons();
      setCoupons(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Could not load coupons');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await adminApi.createCoupon({
        code: form.code.trim(),
        description: form.description.trim() || null,
        type: form.type,
        value: Number(form.value),
        minSubtotal: numberOrNull(form.minSubtotal),
        maxDiscount: form.type === 'PERCENTAGE' ? numberOrNull(form.maxDiscount) : null,
        usageLimit: numberOrNull(form.usageLimit),
        startsAt: dateOrNull(form.startsAt),
        endsAt: dateOrNull(form.endsAt),
      });
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not create the coupon');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      await adminApi.updateCoupon(coupon.id, { active: !coupon.active });
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not update the coupon');
    }
  };

  const remove = async (coupon: Coupon) => {
    if (!confirm(`Remove coupon ${coupon.code}?`)) return;
    try {
      await adminApi.deleteCoupon(coupon.id);
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not remove the coupon');
    }
  };

  const describe = (c: Coupon) =>
    c.type === 'PERCENTAGE'
      ? `${Number(c.value)}% off${c.maxDiscount ? ` (max ${formatPrice(c.maxDiscount)})` : ''}`
      : `${formatPrice(c.value)} off`;

  return (
    <div>
      <AdminHeader title="Coupons" />

      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>New coupon</CardTitle>
            <p className="text-sm text-muted-foreground">
              Discounts come out of the platform&apos;s share; suppliers are paid on the full price.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input id="code" placeholder="WELCOME10" value={form.code} onChange={set('code')} required />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as Coupon['type'] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage off</SelectItem>
                    <SelectItem value="FIXED">Fixed amount off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">{form.type === 'PERCENTAGE' ? 'Percent *' : 'Amount *'}</Label>
                <Input id="value" type="number" min="0" step="0.01" value={form.value} onChange={set('value')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minSubtotal">Minimum order</Label>
                <Input id="minSubtotal" type="number" min="0" step="0.01" value={form.minSubtotal} onChange={set('minSubtotal')} />
              </div>
              {form.type === 'PERCENTAGE' && (
                <div className="space-y-2">
                  <Label htmlFor="maxDiscount">Maximum discount</Label>
                  <Input id="maxDiscount" type="number" min="0" step="0.01" value={form.maxDiscount} onChange={set('maxDiscount')} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="usageLimit">Total uses allowed</Label>
                <Input id="usageLimit" type="number" min="1" step="1" placeholder="Unlimited" value={form.usageLimit} onChange={set('usageLimit')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startsAt">Starts</Label>
                <Input id="startsAt" type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">Ends</Label>
                <Input id="endsAt" type="datetime-local" value={form.endsAt} onChange={set('endsAt')} />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="Shown to customers" value={form.description} onChange={set('description')} />
              </div>
              <div className="md:col-span-3">
                {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={isSaving || !form.code.trim() || !form.value}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Create coupon
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : coupons.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground">No coupons yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Valid</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <span className="font-mono font-medium">{c.code}</span>
                        {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                      </TableCell>
                      <TableCell>
                        {describe(c)}
                        {c.minSubtotal && (
                          <p className="text-xs text-muted-foreground">Min. order {formatPrice(c.minSubtotal)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.usedCount}
                        {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.startsAt ? format(new Date(c.startsAt), 'PP') : 'Now'} –{' '}
                        {c.endsAt ? format(new Date(c.endsAt), 'PP') : 'No end'}
                        {c.endsAt && new Date(c.endsAt) < new Date() && (
                          <Badge variant="secondary" className="ml-2">Expired</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" aria-label={`Remove ${c.code}`} onClick={() => remove(c)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
