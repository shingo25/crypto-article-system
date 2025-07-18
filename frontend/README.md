# Crypto Article System

AI-powered暗号通貨記事自動生成システム

## 🏗️ アーキテクチャ

- **フロントエンド**: Next.js 15 + TypeScript + React 19
- **バックエンド**: FastAPI + SQLAlchemy + Celery  
- **データベース**: PostgreSQL
- **認証**: JWT + HttpOnly Cookies
- **キャッシュ**: Redis

## 📋 開発ガイドライン

### データベース方針 ⚠️ 重要

**🎯 Prisma一本化方針**

2025年1月より、データベースアクセスは**Prisma Client**を正とします。

#### 適用ルール
- ✅ **新規のテーブル操作・クエリはすべてPrisma経由で行うこと**
- ✅ **フロントエンド・APIルート**: Prisma必須
- ⚠️ **既存SQLAlchemy**: 段階的にPrismaへ移行予定
- 🔄 **Celeryワーカー**: 当面SQLAlchemy継続、将来的にPrisma移行

#### 理由
- Next.js 15との完全な親和性
- TypeScript型安全性の向上
- 開発効率の最大化
- 技術的負債の削減

### セキュリティ方針

- JWT認証（HttpOnly Cookies）
- 全APIエンドポイントに入力値検証（Pydantic + Zod）
- レート制限によるDoS攻撃対策
- CSP設定によるXSS対策

## 🚀 開発開始

### 1. 依存関係インストール

```bash
npm install
```

### 2. 環境変数設定

```bash
cp .env.example .env.local
# 必要な環境変数を設定
```

### 3. データベース初期化

```bash
npx prisma generate
npx prisma db push
```

### 4. 開発サーバー起動

```bash
npm run dev
```

開発サーバーが [http://localhost:3000](http://localhost:3000) で起動します。

### 5. バックエンドAPI起動

```bash
cd ../
python api_server.py
```

バックエンドAPIが [http://localhost:8000](http://localhost:8000) で起動します。

## 📁 プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (Prisma使用)
│   ├── (main)/           # メインページ群
│   └── layout.tsx        # ルートレイアウト
├── components/           # Reactコンポーネント
├── lib/                 # ユーティリティ・設定
├── hooks/              # カスタムHooks
└── middleware.ts       # Next.js Middleware
```

## 🧪 テスト

```bash
npm run test        # ユニットテスト
npm run test:e2e    # E2Eテスト  
npm run test:api    # API統合テスト
```

## 🔧 コード品質

```bash
npm run lint        # ESLint
npm run type-check  # TypeScript型チェック
npm run format      # Prettier
```

## 📚 技術仕様

### 認証フロー
1. ユーザーログイン → JWT発行
2. HttpOnly CookieにJWT保存
3. APIリクエスト時にJWT検証
4. 認証失敗時は自動ログアウト

### データフロー
1. **記事生成**: トピック収集 → AI生成 → ファクトチェック → 公開
2. **アラート**: 価格監視 → 閾値判定 → 自動記事生成
3. **分析**: アクセス解析 → パフォーマンス測定 → 改善提案

## 🐳 Docker

```bash
docker-compose up -d    # 開発環境
docker-compose -f docker-compose.prod.yml up -d  # 本番環境
```

## 📈 監視・ログ

- **メトリクス**: Prometheus + Grafana
- **ログ**: Winston + ELK Stack
- **エラー追跡**: Sentry
- **APM**: Next.js Analytics

## 🤝 コントリビューション

1. 機能追加前に issue を作成
2. `feature/機能名` ブランチで開発
3. **Prisma使用** の確認
4. テスト追加
5. Pull Request作成

## 📄 ライセンス

MIT License

---

**⚠️ 注意**: データベース操作は必ずPrismaを使用してください。SQLAlchemyの使用は段階的に廃止予定です。