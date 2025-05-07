/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['res.cloudinary.com'],
  },
};

module.exports = nextConfig;
