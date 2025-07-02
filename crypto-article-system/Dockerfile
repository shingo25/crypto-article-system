# マルチステージビルドでサイズを最適化
FROM node:20-alpine AS base

# 必要なパッケージをインストール
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# 依存関係をコピーしてインストール
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 開発依存関係も含めてビルド用の準備
FROM base AS builder
COPY package*.json ./
RUN npm ci

# ソースコードをコピー
COPY . .

# 環境変数を設定（ビルド時）
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Next.jsアプリケーションをビルド
RUN npm run build

# 本番用イメージ
FROM node:20-alpine AS runner

# セキュリティ: 非特権ユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# 必要なランタイム依存関係をインストール
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# 本番用ファイルをコピー
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# ログディレクトリを作成
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

# Next.jsの設定
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# ポートを公開
EXPOSE 3000

# 非特権ユーザーに切り替え
USER nextjs

# プロセス初期化にdumb-initを使用
ENTRYPOINT ["dumb-init", "--"]

# アプリケーションを起動
CMD ["npm", "start"]