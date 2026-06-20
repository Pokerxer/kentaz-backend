'use client';

import { useState, useEffect } from 'react';
import Image, { ImageProps, ImageLoaderProps } from 'next/image';

const FALLBACK = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600';

/**
 * Custom loader that bypasses Next's `/_next/image` optimizer.
 *
 * The built-in optimizer was returning 500s because it timed out fetching
 * slow remote images (Cloudinary fetches were taking ~5s, near Next's ~7s
 * fetch limit). Cloudinary already serves CDN-optimized images, so we let it
 * do the resizing via URL transforms (`f_auto,q_auto,w_<width>,c_limit`) and
 * pass every other host through untouched. Either way the browser loads the
 * image directly instead of via the Next proxy.
 */
function safeImageLoader({ src, width, quality }: ImageLoaderProps): string {
  const uploadMarker = '/image/upload/';
  if (src.includes('res.cloudinary.com') && src.includes(uploadMarker)) {
    // Don't double-inject transforms if the URL already has them.
    const [base, rest] = src.split(uploadMarker);
    const alreadyTransformed = /^(?:[a-z]{1,3}_[^/]+\/)/.test(rest);
    if (alreadyTransformed) return src;
    const params = ['f_auto', `q_${quality || 'auto'}`, `w_${width}`, 'c_limit'];
    return `${base}${uploadMarker}${params.join(',')}/${rest}`;
  }
  // Non-Cloudinary hosts (Unsplash / Picsum placeholders): serve directly.
  return src;
}

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
      loader={safeImageLoader}
      src={errored ? fallback : src}
      alt={alt}
      onError={() => setErrored(true)}
    />
  );
}
