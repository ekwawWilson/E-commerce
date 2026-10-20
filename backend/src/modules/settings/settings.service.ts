import prisma from '../../config/database';
import config from '../../config';
import { AppError } from '../../middleware/errorHandler';
import logger from '../../utils/logger';

// Short-lived cache for the currency code, which is read on every checkout.
const CURRENCY_CACHE_TTL_MS = 60_000;
let cachedCurrency: string | null = null;
let cachedCurrencyExpiry = 0;

export interface StoreInfo {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  country: string;
}

export interface PaymentMethodsSettings {
  momo: boolean;
  cod: boolean;
  momo_providers: string[];
}

export interface DeliverySettings {
  default_fee: number;
  free_delivery_threshold: number;
  estimated_days_min: number;
  estimated_days_max: number;
  delivery_zones: string[];
}

export interface NotificationSettings {
  admin_email: string;
  admin_whatsapp: string;
  send_order_confirmation_email: boolean;
  send_order_confirmation_sms: boolean;
  send_delivery_updates_sms: boolean;
}

export interface CurrencySettings {
  default_currency: string;
  currency_symbol: string;
  decimal_places: number;
}

export type SettingKey =
  | 'store_info'
  | 'payment_methods_enabled'
  | 'delivery_settings'
  | 'notification_settings'
  | 'currency_settings';

export type SettingValue =
  | StoreInfo
  | PaymentMethodsSettings
  | DeliverySettings
  | NotificationSettings
  | CurrencySettings;

export class SettingsService {
  /**
   * Get a specific setting by key
   */
  async getSetting(key: SettingKey): Promise<SettingValue | null> {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key },
      });

      if (!setting) {
        return null;
      }

      return setting.value as unknown as SettingValue;
    } catch (error) {
      logger.error('Error fetching setting:', error);
      throw new AppError('Failed to fetch setting', 500);
    }
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<Record<string, SettingValue>> {
    try {
      const settings = await prisma.setting.findMany();

      const settingsMap: Record<string, SettingValue> = {};
      settings.forEach((setting) => {
        settingsMap[setting.key] = setting.value as unknown as SettingValue;
      });

      return settingsMap;
    } catch (error) {
      logger.error('Error fetching all settings:', error);
      throw new AppError('Failed to fetch settings', 500);
    }
  }

  /**
   * Update a setting
   */
  async updateSetting(key: SettingKey, value: SettingValue): Promise<SettingValue> {
    try {
      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value: value as any },
        create: { key, value: value as any },
      });

      logger.info(`Setting updated: ${key}`);

      if (key === 'currency_settings') {
        this.invalidateCurrencyCache();
      }

      return setting.value as unknown as SettingValue;
    } catch (error) {
      logger.error('Error updating setting:', error);
      throw new AppError('Failed to update setting', 500);
    }
  }

  /**
   * Update multiple settings at once
   */
  async updateMultipleSettings(
    settings: Partial<Record<SettingKey, SettingValue>>
  ): Promise<Record<string, SettingValue>> {
    try {
      const updates = Object.entries(settings).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: value as any },
          create: { key, value: value as any },
        })
      );

      await Promise.all(updates);

      logger.info(`Updated ${updates.length} settings`);

      if ('currency_settings' in settings) {
        this.invalidateCurrencyCache();
      }

      return this.getAllSettings();
    } catch (error) {
      logger.error('Error updating multiple settings:', error);
      throw new AppError('Failed to update settings', 500);
    }
  }

  /**
   * Get store information
   */
  async getStoreInfo(): Promise<StoreInfo> {
    const storeInfo = await this.getSetting('store_info');
    if (!storeInfo) {
      throw new AppError('Store information not configured', 404);
    }
    return storeInfo as StoreInfo;
  }

  /**
   * Get currency settings
   */
  async getCurrencySettings(): Promise<CurrencySettings> {
    const currencySettings = await this.getSetting('currency_settings');
    if (!currencySettings) {
      // Return defaults
      return {
        default_currency: 'GHS',
        currency_symbol: 'GH₵',
        decimal_places: 2,
      };
    }
    return currencySettings as CurrencySettings;
  }

  /**
   * Currency code for writes (orders, products), read from admin settings.
   *
   * Cached because checkout consults it per order and the database round-trip
   * is remote. `invalidateCurrencyCache()` is called whenever settings are
   * saved, so an admin change takes effect immediately rather than after TTL.
   */
  async getDefaultCurrency(): Promise<string> {
    const now = Date.now();
    if (cachedCurrency && now < cachedCurrencyExpiry) {
      return cachedCurrency;
    }

    try {
      const { default_currency } = await this.getCurrencySettings();
      cachedCurrency = default_currency || config.defaultCurrency;
    } catch {
      // Never block an order on a settings lookup — fall back to config.
      cachedCurrency = config.defaultCurrency;
    }

    cachedCurrencyExpiry = now + CURRENCY_CACHE_TTL_MS;
    return cachedCurrency;
  }

  invalidateCurrencyCache(): void {
    cachedCurrency = null;
    cachedCurrencyExpiry = 0;
  }

  /**
   * Get delivery settings
   */
  async getDeliverySettings(): Promise<DeliverySettings> {
    const deliverySettings = await this.getSetting('delivery_settings');
    if (!deliverySettings) {
      throw new AppError('Delivery settings not configured', 404);
    }
    return deliverySettings as DeliverySettings;
  }
}

export const settingsService = new SettingsService();
