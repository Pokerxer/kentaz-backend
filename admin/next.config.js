const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Disabled in dev by default (causes stale-cache noise).
  // Set NEXT_PUBLIC_ENABLE_PWA=true in .env.local to test offline in dev.
  disable: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_PWA !== 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@medusajs/ui'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.medusa-commerce.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  webpack(config, { dev }) {
    if (dev) {
      // Suppress stale-pack ENOENT warnings caused by next-pwa in dev mode
      config.cache = {
        ...config.cache,
        idleTimeout: 60000,
        idleTimeoutAfterLargeChanges: 1000,
      };
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);