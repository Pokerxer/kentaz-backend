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
    ],
  },
};

module.exports = nextConfig;
