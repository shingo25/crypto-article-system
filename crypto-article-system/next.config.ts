import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'coinmarketcap.com',
      'coingecko.com', 
      'assets.coingecko.com',
      's2.coinmarketcap.com',
      'cryptologos.cc',
      'coin-images.coingecko.com'
    ],
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    optimizePackageImports: ['react-hot-toast', '@tanstack/react-query']
  }
};

export default nextConfig;
