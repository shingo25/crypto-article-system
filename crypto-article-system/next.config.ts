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
      'coin-images.coingecko.com',
      // RSS フィード画像用
      'images.cointelegraph.com',
      'www.coindesk.com',
      'static.coindesk.com',
      'cloudfront-us-east-1.images.arcpublishing.com',
      'media.cointelegraph.com',
      // 一般的な画像ホスト
      'picsum.photos',
      'unsplash.com',
      'images.unsplash.com',
      'via.placeholder.com',
      // Twitter/X画像
      'pbs.twimg.com',
      'abs.twimg.com'
    ],
    formats: ['image/webp', 'image/avif'],
  },
  // experimental: {
  //   optimizePackageImports: ['react-hot-toast', '@tanstack/react-query']
  // }
};

export default nextConfig;
