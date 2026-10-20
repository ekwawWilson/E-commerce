import { Request, Response, NextFunction } from 'express';
import { settingsService, SettingKey, SettingValue } from './settings.service';
import { AppError } from '../../middleware/errorHandler';

export class SettingsController {
  /**
   * Get all settings (Admin only)
   */
  async getAllSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await settingsService.getAllSettings();

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific setting
   */
  async getSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params;

      const setting = await settingsService.getSetting(key as SettingKey);

      if (!setting) {
        throw new AppError(`Setting '${key}' not found`, 404);
      }

      res.json({
        success: true,
        data: setting,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get public settings (accessible without authentication)
   */
  async getPublicSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [storeInfo, currencySettings, deliverySettings, paymentMethods] = await Promise.all([
        settingsService.getSetting('store_info'),
        settingsService.getSetting('currency_settings'),
        settingsService.getSetting('delivery_settings'),
        settingsService.getSetting('payment_methods_enabled'),
      ]);

      res.json({
        success: true,
        data: {
          store_info: storeInfo,
          currency_settings: currencySettings,
          delivery_settings: deliverySettings,
          payment_methods_enabled: paymentMethods,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a setting (Admin only)
   */
  async updateSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (!value) {
        throw new AppError('Setting value is required', 400);
      }

      const updated = await settingsService.updateSetting(key as SettingKey, value as SettingValue);

      res.json({
        success: true,
        message: `Setting '${key}' updated successfully`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update multiple settings at once (Admin only)
   */
  async updateMultipleSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = req.body;

      if (!settings || typeof settings !== 'object') {
        throw new AppError('Invalid settings data', 400);
      }

      const updated = await settingsService.updateMultipleSettings(settings);

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
