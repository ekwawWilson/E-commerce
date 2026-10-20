import { supabase, STORAGE_BUCKET, isSupabaseConfigured } from '../../config/supabase';
import config from '../../config';
import { AppError } from '../../middleware/errorHandler';
import logger from '../../utils/logger';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface UploadOptions {
  folder?: string;
  transformation?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: number;
  };
}

export class UploadService {
  /**
   * Upload single image to Supabase Storage
   */
  async uploadImage(file: Express.Multer.File, options: UploadOptions = {}): Promise<UploadResult> {
    const folder = options.folder || 'products';

    // Use local storage if Supabase is not configured
    if (!isSupabaseConfigured()) {
      logger.warn('Supabase not configured, falling back to local storage');
      return this.localUpload(file, folder);
    }

    try {
      // Generate unique filename
      const uniqueId = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const filename = `${uniqueId}${ext}`;
      const filePath = `${folder}/${filename}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        logger.error('Supabase upload error:', error);
        throw new AppError(`Upload failed: ${error.message}`, 500);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      logger.info(`Supabase upload successful: ${urlData.publicUrl}`);

      return {
        url: urlData.publicUrl,
        publicId: `supabase:${filePath}`,
        width: 800,  // Supabase doesn't return dimensions
        height: 600,
        format: ext.replace('.', ''),
        bytes: file.size,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      // Fallback to local storage if Supabase fails
      logger.warn('Supabase upload failed, falling back to local storage:', error);
      return this.localUpload(file, folder);
    }
  }

  /**
   * Local storage upload (fallback when Supabase fails or not configured)
   */
  private async localUpload(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', folder);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const uniqueId = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const filename = `${uniqueId}${ext}`;
      const filepath = path.join(uploadsDir, filename);

      // Write file to disk
      fs.writeFileSync(filepath, file.buffer);

      // Return result with local prefix to identify local uploads
      const publicId = `local:${folder}/${uniqueId}`;
      const url = `http://localhost:${config.port}/uploads/${folder}/${filename}`;

      logger.info(`Local upload saved: ${url}`);

      return {
        url,
        publicId,
        width: 800,
        height: 600,
        format: ext.replace('.', ''),
        bytes: file.size,
      };
    } catch (error) {
      logger.error('Local upload error:', error);
      throw new AppError('Failed to upload image', 500);
    }
  }

  /**
   * Upload multiple images
   */
  async uploadImages(
    files: Express.Multer.File[],
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    if (files.length > config.maxImagesPerProduct) {
      throw new AppError(`Maximum ${config.maxImagesPerProduct} images allowed`, 400);
    }

    const results = await Promise.all(
      files.map((file) => this.uploadImage(file, options))
    );

    return results;
  }

  /**
   * Delete image by public ID
   */
  async deleteImage(publicId: string): Promise<boolean> {
    // Check if it's a local upload (prefixed with "local:")
    if (publicId.startsWith('local:')) {
      return this.localDelete(publicId.replace('local:', ''));
    }

    // Check if it's a Supabase upload (prefixed with "supabase:")
    if (publicId.startsWith('supabase:')) {
      return this.supabaseDelete(publicId.replace('supabase:', ''));
    }

    // Try Supabase delete for legacy uploads without prefix
    if (isSupabaseConfigured()) {
      return this.supabaseDelete(publicId);
    }

    // Fallback to local delete
    return this.localDelete(publicId);
  }

  /**
   * Supabase storage delete
   */
  private async supabaseDelete(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      if (error) {
        logger.error('Supabase delete error:', error);
        return false;
      }

      logger.info(`Supabase delete successful: ${filePath}`);
      return true;
    } catch (error) {
      logger.error('Supabase delete error:', error);
      return false;
    }
  }

  /**
   * Local storage delete
   */
  private localDelete(publicId: string): boolean {
    try {
      // Find and delete the file from local storage
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      const parts = publicId.split('/');
      const folder = parts[0];
      const fileId = parts[1];

      // Try to find and delete file with any extension
      const folderPath = path.join(uploadsDir, folder);
      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath);
        const matchingFile = files.find(f => f.startsWith(fileId));
        if (matchingFile) {
          fs.unlinkSync(path.join(folderPath, matchingFile));
          logger.info(`Local delete: ${publicId}`);
          return true;
        }
      }
      return true; // Return true even if file not found (already deleted)
    } catch (error) {
      logger.error('Local delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple images
   */
  async deleteImages(publicIds: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    const results = {
      deleted: [] as string[],
      failed: [] as string[],
    };

    await Promise.all(
      publicIds.map(async (publicId) => {
        try {
          const success = await this.deleteImage(publicId);
          if (success) {
            results.deleted.push(publicId);
          } else {
            results.failed.push(publicId);
          }
        } catch {
          results.failed.push(publicId);
        }
      })
    );

    return results;
  }

  /**
   * Get optimized URL (for Supabase, returns the same URL as no transformations are available)
   * For image transformations, consider using Supabase Image Transformation or a CDN
   */
  getOptimizedUrl(
    publicId: string,
    _options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: number;
      format?: string;
    } = {}
  ): string {
    // Supabase Storage doesn't have built-in transformations
    // Return the public URL directly
    if (publicId.startsWith('supabase:')) {
      const filePath = publicId.replace('supabase:', '');
      const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);
      return data.publicUrl;
    }

    // For local files, return as-is
    return publicId;
  }

  /**
   * Generate thumbnail URL (same as optimized URL for Supabase)
   */
  getThumbnailUrl(publicId: string, _size = 150): string {
    return this.getOptimizedUrl(publicId);
  }
}

export const uploadService = new UploadService();
