'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { adminApi } from '@/lib/api/admin';

// Check if URL is a local upload (localhost)
const isLocalUrl = (url: string) => {
  return url.includes('localhost') || url.startsWith('/uploads');
};

export interface UploadedImage {
  url: string;
  publicId: string;
  isPrimary: boolean;
}

interface ImageUploadProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  folder?: string;
}

export function ImageUpload({
  images,
  onImagesChange,
  maxImages = 6,
  folder = 'products',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const remainingSlots = maxImages - images.length;
      if (remainingSlots <= 0) {
        alert(`Maximum ${maxImages} images allowed`);
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots);

      // Validate files
      for (const file of filesToUpload) {
        if (!file.type.startsWith('image/')) {
          alert('Only image files are allowed');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          alert('File size must be less than 5MB');
          return;
        }
      }

      setIsUploading(true);

      try {
        const response = await adminApi.uploadImages(filesToUpload, folder);

        if (response.success && response.data) {
          const newImages: UploadedImage[] = response.data.map(
            (img: any, index: number) => ({
              url: img.url,
              publicId: img.publicId,
              isPrimary: images.length === 0 && index === 0,
            })
          );

          onImagesChange([...images, ...newImages]);
        }
      } catch (error) {
        console.error('Upload failed:', error);
        alert('Failed to upload images');
      } finally {
        setIsUploading(false);
      }
    },
    [images, maxImages, folder, onImagesChange]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleRemove = async (index: number) => {
    const imageToRemove = images[index];

    try {
      await adminApi.deleteImage(imageToRemove.publicId);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }

    const newImages = images.filter((_, i) => i !== index);

    // If we removed the primary image, make the first one primary
    if (imageToRemove.isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }

    onImagesChange(newImages);
  };

  const handleSetPrimary = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={cn(
          'relative flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          images.length >= maxImages && 'cursor-not-allowed opacity-50'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={images.length >= maxImages || isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Drag & drop images or click to upload
              </p>
              <p className="text-xs text-muted-foreground">
                Max {maxImages} images, 5MB each
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {images.map((image, index) => (
            <div
              key={image.publicId}
              className={cn(
                'group relative aspect-square overflow-hidden rounded-lg border',
                image.isPrimary && 'ring-2 ring-primary'
              )}
            >
              {isLocalUrl(image.url) ? (
                <img
                  src={image.url}
                  alt={`Product image ${index + 1}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={image.url}
                  alt={`Product image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              )}

              {/* Overlay */}
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleSetPrimary(index)}
                  title="Set as primary"
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      image.isPrimary && 'fill-yellow-400 text-yellow-400'
                    )}
                  />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Primary Badge */}
              {image.isPrimary && (
                <div className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {images.length}/{maxImages} images uploaded
      </p>
    </div>
  );
}
