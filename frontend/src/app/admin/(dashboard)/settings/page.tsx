'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, Store, DollarSign, Truck, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AdminHeader } from '@/components/admin/header';
import { useToast } from '@/hooks/use-toast';
import { getAuthToken } from '@/stores/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface StoreInfo {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  country: string;
}

interface CurrencySettings {
  default_currency: string;
  currency_symbol: string;
  decimal_places: number;
}

interface DeliverySettings {
  default_fee: number;
  free_delivery_threshold: number;
  estimated_days_min: number;
  estimated_days_max: number;
  delivery_zones: string[];
}

interface NotificationSettings {
  admin_email: string;
  admin_whatsapp: string;
  send_order_confirmation_email: boolean;
  send_order_confirmation_sms: boolean;
  send_delivery_updates_sms: boolean;
}

interface PaymentMethodsSettings {
  momo: boolean;
  cod: boolean;
  momo_providers: string[];
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Store Information
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    country: 'Cameroon',
  });

  // Currency Settings
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>({
    default_currency: 'GHS',
    currency_symbol: 'GH₵',
    decimal_places: 2,
  });

  // Delivery Settings
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({
    default_fee: 2000,
    free_delivery_threshold: 100000,
    estimated_days_min: 1,
    estimated_days_max: 3,
    delivery_zones: [],
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    admin_email: '',
    admin_whatsapp: '',
    send_order_confirmation_email: true,
    send_order_confirmation_sms: true,
    send_delivery_updates_sms: true,
  });

  // Payment Methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsSettings>({
    momo: true,
    cod: true,
    momo_providers: ['MTN_MOMO'],
  });

  const [deliveryZonesInput, setDeliveryZonesInput] = useState('');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();

      const response = await fetch(`${API_URL}/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load settings');

      const data = await response.json();

      if (data.success && data.data) {
        if (data.data.store_info) setStoreInfo(data.data.store_info);
        if (data.data.currency_settings) setCurrencySettings(data.data.currency_settings);
        if (data.data.delivery_settings) {
          setDeliverySettings(data.data.delivery_settings);
          setDeliveryZonesInput(data.data.delivery_settings.delivery_zones.join(', '));
        }
        if (data.data.notification_settings) setNotificationSettings(data.data.notification_settings);
        if (data.data.payment_methods_enabled) setPaymentMethods(data.data.payment_methods_enabled);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (settingsType: string, settingsData: any) => {
    setIsSaving(true);
    try {
      const token = getAuthToken();

      const response = await fetch(`${API_URL}/settings/${settingsType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value: settingsData }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStoreInfo = () => {
    handleSaveSettings('store_info', storeInfo);
  };

  const handleSaveCurrency = () => {
    handleSaveSettings('currency_settings', currencySettings);
  };

  const handleSaveDelivery = () => {
    const zones = deliveryZonesInput
      .split(',')
      .map((z) => z.trim())
      .filter((z) => z.length > 0);

    handleSaveSettings('delivery_settings', {
      ...deliverySettings,
      delivery_zones: zones,
    });
  };

  const handleSaveNotifications = () => {
    handleSaveSettings('notification_settings', notificationSettings);
  };

  const handleSavePaymentMethods = () => {
    handleSaveSettings('payment_methods_enabled', paymentMethods);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <AdminHeader title="Store Settings" />

      <div className="p-6">
        <Tabs defaultValue="store" className="space-y-6">
          <TabsList>
            <TabsTrigger value="store">
              <Store className="mr-2 h-4 w-4" />
              Store Info
            </TabsTrigger>
            <TabsTrigger value="currency">
              <DollarSign className="mr-2 h-4 w-4" />
              Currency
            </TabsTrigger>
            <TabsTrigger value="delivery">
              <Truck className="mr-2 h-4 w-4" />
              Delivery
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          </TabsList>

          {/* Store Information Tab */}
          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
                <CardDescription>
                  Manage your store's basic information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input
                      id="storeName"
                      value={storeInfo.name}
                      onChange={(e) =>
                        setStoreInfo({ ...storeInfo, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={storeInfo.email}
                      onChange={(e) =>
                        setStoreInfo({ ...storeInfo, email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={storeInfo.phone}
                      onChange={(e) =>
                        setStoreInfo({ ...storeInfo, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      value={storeInfo.whatsapp}
                      onChange={(e) =>
                        setStoreInfo({ ...storeInfo, whatsapp: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={storeInfo.address}
                    onChange={(e) =>
                      setStoreInfo({ ...storeInfo, address: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={storeInfo.city}
                      onChange={(e) =>
                        setStoreInfo({ ...storeInfo, city: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={storeInfo.country}
                      onChange={(e) =>
                        setStoreInfo({ ...storeInfo, country: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveStoreInfo} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Currency Settings Tab */}
          <TabsContent value="currency">
            <Card>
              <CardHeader>
                <CardTitle>Currency Settings</CardTitle>
                <CardDescription>
                  Configure your store's currency and display format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency Code</Label>
                    <Input
                      id="currency"
                      value={currencySettings.default_currency}
                      onChange={(e) =>
                        setCurrencySettings({
                          ...currencySettings,
                          default_currency: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="GHS"
                    />
                    <p className="text-xs text-muted-foreground">
                      ISO currency code (e.g., XAF, USD, EUR)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Currency Symbol</Label>
                    <Input
                      id="symbol"
                      value={currencySettings.currency_symbol}
                      onChange={(e) =>
                        setCurrencySettings({
                          ...currencySettings,
                          currency_symbol: e.target.value,
                        })
                      }
                      placeholder="GH₵"
                    />
                    <p className="text-xs text-muted-foreground">
                      How currency is displayed (e.g., GH₵, ₦, $)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="decimals">Decimal Places</Label>
                    <Input
                      id="decimals"
                      type="number"
                      min="0"
                      max="2"
                      value={currencySettings.decimal_places}
                      onChange={(e) =>
                        setCurrencySettings({
                          ...currencySettings,
                          decimal_places: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of decimal places (0-2)
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <p className="text-2xl font-bold">
                    1{currencySettings.decimal_places > 0 ? ',234.50' : ',235'} {currencySettings.currency_symbol}
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveCurrency} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Currency Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Settings Tab */}
          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Settings</CardTitle>
                <CardDescription>
                  Configure delivery fees and zones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryFee">Default Delivery Fee</Label>
                    <Input
                      id="deliveryFee"
                      type="number"
                      value={deliverySettings.default_fee}
                      onChange={(e) =>
                        setDeliverySettings({
                          ...deliverySettings,
                          default_fee: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freeThreshold">Free Delivery Threshold</Label>
                    <Input
                      id="freeThreshold"
                      type="number"
                      value={deliverySettings.free_delivery_threshold}
                      onChange={(e) =>
                        setDeliverySettings({
                          ...deliverySettings,
                          free_delivery_threshold: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="minDays">Estimated Days (Min)</Label>
                    <Input
                      id="minDays"
                      type="number"
                      min="1"
                      value={deliverySettings.estimated_days_min}
                      onChange={(e) =>
                        setDeliverySettings({
                          ...deliverySettings,
                          estimated_days_min: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxDays">Estimated Days (Max)</Label>
                    <Input
                      id="maxDays"
                      type="number"
                      min="1"
                      value={deliverySettings.estimated_days_max}
                      onChange={(e) =>
                        setDeliverySettings({
                          ...deliverySettings,
                          estimated_days_max: parseInt(e.target.value) || 3,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zones">Delivery Zones (comma-separated)</Label>
                  <Input
                    id="zones"
                    value={deliveryZonesInput}
                    onChange={(e) => setDeliveryZonesInput(e.target.value)}
                    placeholder="Yaoundé, Douala, Bafoussam"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter city or region names separated by commas
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveDelivery} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Delivery Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={notificationSettings.admin_email}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          admin_email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminWhatsApp">Admin WhatsApp</Label>
                    <Input
                      id="adminWhatsApp"
                      value={notificationSettings.admin_whatsapp}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          admin_whatsapp: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order Confirmation Email</p>
                      <p className="text-sm text-muted-foreground">
                        Send email confirmations for new orders
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.send_order_confirmation_email}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          send_order_confirmation_email: checked,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order Confirmation SMS</p>
                      <p className="text-sm text-muted-foreground">
                        Send SMS confirmations for new orders
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.send_order_confirmation_sms}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          send_order_confirmation_sms: checked,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delivery Updates SMS</p>
                      <p className="text-sm text-muted-foreground">
                        Send SMS updates for delivery status changes
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.send_delivery_updates_sms}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          send_delivery_updates_sms: checked,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveNotifications} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Preferences
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  Enable or disable payment methods for your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Mobile Money (MoMo)</p>
                    <p className="text-sm text-muted-foreground">
                      Accept payments via mobile money
                    </p>
                  </div>
                  <Switch
                    checked={paymentMethods.momo}
                    onCheckedChange={(checked) =>
                      setPaymentMethods({ ...paymentMethods, momo: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Cash on Delivery (COD)</p>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to pay cash on delivery
                    </p>
                  </div>
                  <Switch
                    checked={paymentMethods.cod}
                    onCheckedChange={(checked) =>
                      setPaymentMethods({ ...paymentMethods, cod: checked })
                    }
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSavePaymentMethods} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Payment Methods
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
