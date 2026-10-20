'use client';

import Image, { ImageProps } from 'next/image';

// Check if URL is a local upload (localhost)
const isLocalUrl = (url: string) => {
  return url.includes('localhost') || url.startsWith('/uploads');
};

interface ProductImageProps extends Omit<ImageProps, 'src'> {
  src: string;
}

export function ProductImage({ src, alt, className, fill, sizes, ...props }: ProductImageProps) {
  // For local URLs, use regular img tag to avoid Next.js image optimization issues
  if (isLocalUrl(src)) {
    if (fill) {
      return (
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 h-full w-full ${className || ''}`}
          {...(props as React.ImgHTMLAttributes<HTMLImageElement>)}
        />
      );
    }
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        {...(props as React.ImgHTMLAttributes<HTMLImageElement>)}
      />
    );
  }

  // For remote URLs (Cloudinary, etc.), use Next.js Image component
  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      fill={fill}
      sizes={sizes}
      {...props}
    />
  );
}
