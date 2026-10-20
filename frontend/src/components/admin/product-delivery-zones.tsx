'use client';

import { Plus, Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export interface DeliveryZone {
  zoneName: string;
  zoneType: string;
  region?: string;
  minDays: number;
  maxDays: number;
  deliveryFee?: number;
  available: boolean;
  notes?: string;
}

interface ProductDeliveryZonesProps {
  deliveryZones: DeliveryZone[];
  onChange: (zones: DeliveryZone[]) => void;
}

// Common delivery zones for Ghana
const COMMON_ZONES = [
  { name: 'Accra', type: 'city', region: 'Greater Accra' },
  { name: 'Tema', type: 'city', region: 'Greater Accra' },
  { name: 'Kumasi', type: 'city', region: 'Ashanti' },
  { name: 'Takoradi', type: 'city', region: 'Western' },
  { name: 'Cape Coast', type: 'city', region: 'Central' },
  { name: 'Tamale', type: 'city', region: 'Northern' },
  { name: 'Ho', type: 'city', region: 'Volta' },
  { name: 'Koforidua', type: 'city', region: 'Eastern' },
  { name: 'Sunyani', type: 'city', region: 'Bono' },
  { name: 'Wa', type: 'city', region: 'Upper West' },
  { name: 'Bolgatanga', type: 'city', region: 'Upper East' },
  { name: 'Greater Accra Region', type: 'region', region: 'Greater Accra' },
  { name: 'Ashanti Region', type: 'region', region: 'Ashanti' },
  { name: 'Western Region', type: 'region', region: 'Western' },
  { name: 'Central Region', type: 'region', region: 'Central' },
  { name: 'Eastern Region', type: 'region', region: 'Eastern' },
  { name: 'Volta Region', type: 'region', region: 'Volta' },
  { name: 'Northern Region', type: 'region', region: 'Northern' },
  { name: 'Bono Region', type: 'region', region: 'Bono' },
  { name: 'Upper East Region', type: 'region', region: 'Upper East' },
  { name: 'Upper West Region', type: 'region', region: 'Upper West' },
  { name: 'National (All Ghana)', type: 'country', region: undefined },
  { name: 'International', type: 'international', region: undefined },
];

const ZONE_TYPES = [
  { value: 'city', label: 'City' },
  { value: 'region', label: 'Region' },
  { value: 'country', label: 'National' },
  { value: 'international', label: 'International' },
];

export function ProductDeliveryZones({
  deliveryZones,
  onChange,
}: ProductDeliveryZonesProps) {
  const addZone = () => {
    onChange([
      ...deliveryZones,
      {
        zoneName: '',
        zoneType: 'city',
        minDays: 1,
        maxDays: 3,
        available: true,
      },
    ]);
  };

  const addCommonZone = (zone: typeof COMMON_ZONES[0]) => {
    // Check if already added
    if (deliveryZones.some((z) => z.zoneName === zone.name)) {
      return;
    }

    onChange([
      ...deliveryZones,
      {
        zoneName: zone.name,
        zoneType: zone.type,
        region: zone.region,
        minDays: zone.type === 'city' ? 1 : zone.type === 'region' ? 2 : 5,
        maxDays: zone.type === 'city' ? 3 : zone.type === 'region' ? 5 : 14,
        available: true,
      },
    ]);
  };

  const updateZone = (index: number, updates: Partial<DeliveryZone>) => {
    const updated = [...deliveryZones];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeZone = (index: number) => {
    onChange(deliveryZones.filter((_, i) => i !== index));
  };

  const usedZoneNames = new Set(deliveryZones.map((z) => z.zoneName));
  const availableCommonZones = COMMON_ZONES.filter(
    (z) => !usedZoneNames.has(z.name)
  );

  return (
    <div className="space-y-4">
      {/* Quick add common zones */}
      {availableCommonZones.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">Quick Add Zone</Label>
          <Select
            value=""
            onValueChange={(value) => {
              const zone = COMMON_ZONES.find((z) => z.name === value);
              if (zone) addCommonZone(zone);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a common delivery zone..." />
            </SelectTrigger>
            <SelectContent>
              {availableCommonZones.map((zone) => (
                <SelectItem key={zone.name} value={zone.name}>
                  {zone.name} ({zone.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Custom zone button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addZone}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Custom Delivery Zone
      </Button>

      {/* Zone list */}
      {deliveryZones.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No delivery zones added. Add zones to specify delivery periods for different locations.
        </p>
      ) : (
        <div className="space-y-4">
          {deliveryZones.map((zone, index) => (
            <div
              key={index}
              className="rounded-lg border bg-muted/30 p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Zone Name</Label>
                    <Input
                      value={zone.zoneName}
                      onChange={(e) =>
                        updateZone(index, { zoneName: e.target.value })
                      }
                      placeholder="e.g., Accra"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Zone Type</Label>
                    <Select
                      value={zone.zoneType}
                      onValueChange={(value) =>
                        updateZone(index, { zoneType: value })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ZONE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-2 h-9 w-9 shrink-0"
                  onClick={() => removeZone(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Min Days</Label>
                  <Input
                    type="number"
                    min="1"
                    value={zone.minDays}
                    onChange={(e) =>
                      updateZone(index, { minDays: parseInt(e.target.value) || 1 })
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Days</Label>
                  <Input
                    type="number"
                    min="1"
                    value={zone.maxDays}
                    onChange={(e) =>
                      updateZone(index, { maxDays: parseInt(e.target.value) || 1 })
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Delivery Fee (optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={zone.deliveryFee || ''}
                    onChange={(e) =>
                      updateZone(index, {
                        deliveryFee: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="0"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Available</Label>
                  <div className="flex h-9 items-center">
                    <Switch
                      checked={zone.available}
                      onCheckedChange={(checked) =>
                        updateZone(index, { available: checked })
                      }
                    />
                    <span className="ml-2 text-xs text-muted-foreground">
                      {zone.available ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Delivery: {zone.minDays}-{zone.maxDays} days
                {zone.deliveryFee ? ` | Fee: ${formatPrice(zone.deliveryFee)}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-muted-foreground">
        Set delivery periods for different locations. Customers will see estimated delivery times based on their location.
      </p>
    </div>
  );
}
