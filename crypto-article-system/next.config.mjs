/** @type {import('next').NextConfig} */
const nextConfig = {
  
  // TypeScript設定
  typescript: {
    // 型チェックを常に実行（セキュリティ上重要）
    ignoreBuildErrors: false,
  },
  
  // ESLint設定
  eslint: {
    // lintチェックを常に実行（セキュリティ上重要）
    ignoreDuringBuilds: false,
  },
  
  // 画像最適化設定
  images: {
    unoptimized: true, // 静的エクスポート時は画像最適化を無効化
  },
  
  // 出力設定
  output: 'standalone', // Docker等での利用を想定
  
  // プリレンダリングを無効化（認証システムで動的コンテンツが多いため）
  trailingSlash: false,
  
  // WebPack設定
  webpack: (config, { isServer }) => {
    // クライアントサイドでのNode.js専用モジュール除外
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    
    return config
  },
  
  // 環境変数設定
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // ページ設定
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  
  // 実験的機能
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3001', 'localhost:3002'],
    },
  },
  
  // 静的生成を制限（認証システムのため）
  generateBuildId: async () => {
    return 'crypto-article-system-' + Date.now()
  },
}

export default nextConfig