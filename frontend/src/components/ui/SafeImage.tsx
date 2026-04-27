'use client';

import { useState, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';

const FALLBACK = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600';

type SafeImageProps = Omit<ImageProps, 'onError'> & {
  fallback?: string;
};

/**
 * Drop-in replacement for next/image that gracefully falls back to a
 * placeholder when the source URL fails to load (e.g. deleted Cloudinary asset,
 * network error, or invalid URL).
 */
export default function SafeImage({ src, fallback = FALLBACK, alt, ...props }: SafeImageProps) {
  const [errored, setErrored] = useState(false);

  // Reset error state when the src prop changes (e.g. carousel navigation)
  useEffect(() => {
    setErrored(false);
  }, [src]);

  return (
    <Image
      {...props}
      src={errored ? fallback : src}
      alt={alt}
      onError={() => setErrored(true)}
    />
  );
}
