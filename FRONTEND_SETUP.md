# フロントエンド セットアップガイド

## 📋 概要

このガイドでは、暗号通貨記事生成システムのフロントエンドWebアプリケーションをセットアップする手順を説明します。

## 🚀 クイックスタート

### 1. 依存関係のインストール

```bash
# プロジェクトのルートディレクトリに移動
cd crypto-article-system

# Node.js依存関係をインストール
cd crypto-article-system  # フロントエンドディレクトリ
npm install
```

### 2. 環境変数の設定

フロントエンド用の環境変数ファイルを作成：

```bash
# crypto-article-system/.env.local を作成
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

### 3. バックエンドAPIサーバーの起動

```bash
# ルートディレクトリに戻る
cd ..

# Python仮想環境をアクティベート
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate   # Windows

# FastAPI依存関係をインストール
pip install fastapi uvicorn

# APIサーバーを起動
python api_server.py
```

APIサーバーは `http://localhost:8000` で起動します。

### 4. フロントエンドの起動

新しいターミナルで：

```bash
cd crypto-article-system/crypto-article-system
npm run dev
```

フロントエンドは `http://localhost:3000` で起動します。

## 🎯 利用可能な機能

### ダッシュボード (`/`)

- **システム状況**: 現在の稼働状態、記事生成数、トピック収集数
- **最新トピック**: 収集されたトピックの一覧とスコア
- **生成記事**: 作成された記事の一覧とステータス
- **システムログ**: リアルタイムのシステム情報

### 主な操作

1. **システム制御**
   - 🟢 開始ボタン: 記事生成パイプラインを開始
   - 🔴 停止ボタン: システムを停止

2. **記事生成**
   - トピック一覧から「記事生成」ボタンをクリック
   - バックグラウンドで記事が生成されます

3. **記事プレビュー**
   - 生成記事一覧から「プレビュー」ボタンをクリック
   - 記事の内容を確認できます

## 🔧 開発モード

### ホットリロード

ファイルを編集すると自動的にブラウザが更新されます。

### APIモック

バックエンドが起動していない場合、フロントエンドはモックデータを表示します。

## 📝 API エンドポイント

フロントエンドが使用するAPIエンドポイント：

```
GET  /api/system/stats          # システム統計
POST /api/system/control        # システム制御
GET  /api/topics               # トピック一覧
GET  /api/articles             # 記事一覧
POST /api/articles/generate    # 記事生成
GET  /api/articles/{id}        # 記事詳細
POST /api/articles/{id}/fact-check  # ファクトチェック
GET  /api/logs                 # ログ
GET  /api/wordpress/config     # WordPress設定
POST /api/wordpress/test       # WordPress接続テスト
```

## 🐛 トラブルシューティング

### よくある問題

1. **フロントエンドが起動しない**
   ```bash
   # Node.jsのバージョンを確認
   node --version  # v18以上が必要
   
   # 依存関係を再インストール
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **APIサーバーに接続できない**
   ```bash
   # APIサーバーが起動しているか確認
   curl http://localhost:8000/health
   
   # 環境変数を確認
   cat .env.local
   ```

3. **CORSエラー**
   - APIサーバーのCORS設定を確認
   - フロントエンドのURLが許可されているか確認

### ログの確認

```bash
# フロントエンドのログ
# ブラウザの開発者ツール -> Console

# バックエンドのログ
# APIサーバーのターミナル出力を確認
```

## 🎨 カスタマイズ

### スタイリング

- `src/app/globals.css`: グローバルスタイル
- `tailwind.config.ts`: Tailwind CSS設定
- `src/components/ui/`: UIコンポーネント

### 新しいページの追加

```bash
# 新しいページを作成
mkdir src/app/settings
touch src/app/settings/page.tsx
```

### 新しいAPIエンドポイントの追加

```typescript
// src/lib/api.ts に新しいメソッドを追加
async newEndpoint() {
  return this.request<ResponseType>('/api/new-endpoint')
}
```

## 📦 ビルドとデプロイ

### 本番ビルド

```bash
npm run build
npm start
```

### Docker でのデプロイ

```bash
# ルートディレクトリで
docker-compose up frontend
```

## 🔗 関連リンク

- [Next.js ドキュメント](https://nextjs.org/docs)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/docs)
- [FastAPI ドキュメント](https://fastapi.tiangolo.com/)

## 💡 次のステップ

1. **認証システムの追加**
2. **リアルタイム更新（WebSocket）**
3. **記事編集機能の強化**
4. **WordPress自動投稿の設定**
5. **ダッシュボードのカスタマイズ**