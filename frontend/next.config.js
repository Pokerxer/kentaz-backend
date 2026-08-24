/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Security headers — also trust signals for search engines
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      // Cloudinary — primary image host for product uploads
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      // Unsplash — used for placeholder/fallback images
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      // Picsum — used for placeholder images
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      // Loremflickr — alternate placeholder source
      {
        protocol: 'https',
        hostname: 'loremflickr.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
