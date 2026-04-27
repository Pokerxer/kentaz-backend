/** @type {import('next').NextConfig} */
const nextConfig = {
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
