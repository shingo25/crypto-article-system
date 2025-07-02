import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ビルド時にESLintエラーを無視（開発時は引き続きチェック）
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ビルド時にTypeScriptエラーを無視（開発時は引き続きチェック）
    ignoreBuildErrors: true,
  },
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
  // experimental: {
  //   optimizePackageImports: ['react-hot-toast', '@tanstack/react-query']
  // }
};

export default nextConfig;
