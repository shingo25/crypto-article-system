# CryptoAI Pro - 暗号通貨記事自動生成システム 仕様書

## 📋 プロジェクト概要

**システム名**: CryptoAI Pro - Crypto Article System  
**バージョン**: 1.0.0  
**開発期間**: 2024年〜  
**目的**: 暗号通貨関連のトピックを自動収集し、AI（OpenAI/Gemini）を使用して高品質な記事を自動生成、WordPressに投稿する統合システム

### 🎯 システムの目標
- 暗号通貨市場のリアルタイム情報収集
- AI駆動による高品質記事の自動生成
- ファクトチェック機能による信頼性向上
- WordPress連携による自動投稿
- 完全モバイル対応のモダンWebUI

---

## 🏗️ システム設計

### アーキテクチャ概要
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   フロントエンド   │ ←→ │   バックエンド    │ ←→ │   外部サービス   │
│   (Next.js)     │    │   (FastAPI)     │    │  (AI/WordPress) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ↕                       ↕                       ↕
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     WebUI       │    │   データベース    │    │   外部データ    │
│  (shadcn/ui)    │    │ (PostgreSQL)    │    │   (RSS/API)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 📁 プロジェクト構造

```
crypto-article-system/
├── 🐍 バックエンド（Python FastAPI）
│   ├── api_server.py                     # メインAPIサーバー
│   ├── celery_app.py                     # 非同期タスク処理
│   ├── scheduler.py                      # スケジューラー管理
│   ├── auth.py                          # API認証システム
│   ├── run_pipeline.py                  # パイプライン実行
│   ├── migrate_templates.py             # テンプレート移行
│   │
│   ├── src/                            # コアモジュール
│   │   ├── article_pipeline.py         # 記事生成パイプライン
│   │   ├── topic_collector.py          # トピック収集エンジン
│   │   ├── crypto_article_generator_mvp.py # AI記事生成
│   │   ├── fact_checker.py             # ファクトチェック機能
│   │   ├── wordpress_publisher.py      # WordPress投稿
│   │   ├── database.py                 # データベースモデル
│   │   └── config_manager.py           # 設定管理
│   │
│   ├── alembic/                        # DBマイグレーション
│   ├── scripts/                        # ユーティリティ
│   └── tests/                          # テストコード
│
├── ⚛️ フロントエンド（Next.js 14 + React）
│   └── crypto-article-system/
│       ├── src/
│       │   ├── app/                    # Next.js App Router
│       │   │   └── page.tsx           # メインダッシュボード
│       │   ├── components/             # Reactコンポーネント
│       │   │   ├── ui/                # shadcn/ui基本コンポーネント
│       │   │   ├── TopicList.tsx      # トピック一覧
│       │   │   ├── ArticleList.tsx    # 記事一覧
│       │   │   ├── ArticleEditor.tsx  # 記事エディタ
│       │   │   ├── SettingsPage.tsx   # 設定画面
│       │   │   └── CommandPalette.tsx # コマンドパレット
│       │   ├── hooks/                 # カスタムフック
│       │   │   ├── useTopics.ts       # トピック管理
│       │   │   ├── useArticles.ts     # 記事管理
│       │   │   └── useSystemStats.ts  # システム統計
│       │   └── lib/                   # ユーティリティ
│       │       ├── api.ts             # API クライアント
│       │       └── utils.ts           # 共通関数
│       │
│       ├── public/                    # 静的ファイル
│       ├── tailwind.config.ts         # Tailwind設定
│       ├── next.config.mjs           # Next.js設定
│       └── package.json              # 依存関係
│
├── 🐳 インフラストラクチャ
│   ├── docker-compose.yml            # Docker構成
│   ├── Dockerfile                    # Dockerイメージ
│   ├── requirements.txt              # Python依存関係
│   └── .env                         # 環境変数
│
└── 📄 ドキュメント
    ├── README.md                     # プロジェクト概要
    ├── frontend-spec.md              # フロントエンド仕様
    ├── CLAUDE.md                     # Claude Code ガイドライン
    └── document.md                   # 本仕様書
```

---

## 🛠️ 技術スタック

### バックエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| **Python** | 3.8+ | プログラミング言語 |
| **FastAPI** | latest | Web API フレームワーク |
| **SQLAlchemy** | latest | ORM (Object-Relational Mapping) |
| **Alembic** | latest | データベースマイグレーション |
| **Celery** | latest | 非同期タスクキュー |
| **Redis** | latest | キャッシュ・メッセージブローカー |
| **PostgreSQL** | 13+ | 本番データベース |
| **SQLite** | 3.x | 開発用データベース |
| **APScheduler** | latest | スケジューラー |
| **BeautifulSoup4** | latest | HTMLパーサー |
| **feedparser** | latest | RSSフィードパーサー |
| **python-wordpress-xmlrpc** | latest | WordPress連携 |
| **cryptography** | latest | 暗号化・復号化 |
| **httpx** | latest | HTTP クライアント |

### フロントエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| **Next.js** | 14+ | React フレームワーク |
| **React** | 18+ | UI ライブラリ |
| **TypeScript** | 5+ | 型安全性 |
| **Tailwind CSS** | 3+ | CSS フレームワーク |
| **shadcn/ui** | latest | UI コンポーネントライブラリ |
| **React Query** | latest | サーバー状態管理 |
| **Lucide React** | latest | アイコンライブラリ |
| **React Hook Form** | latest | フォーム管理 |
| **Zod** | latest | スキーマ検証 |

### AI・外部サービス
| サービス | 用途 | APIキー必要 |
|----------|------|-------------|
| **OpenAI GPT-4** | 記事生成・ファクトチェック | ✅ |
| **Google Gemini** | 記事生成・ファクトチェック | ✅ |
| **CoinGecko API** | 暗号通貨価格データ | ❌ |
| **WordPress XML-RPC** | 記事投稿 | ✅ |

---

## 📊 データベース設計

### ERD (Entity Relationship Diagram)
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    topics    │ 1→N│   articles   │ 1→1│fact_check_   │
│              │    │              │    │   results    │
│ • id (PK)    │    │ • id (PK)    │    │ • id (PK)    │
│ • title      │    │ • topic_id   │    │ • article_id │
│ • content    │    │ • title      │    │ • score      │
│ • score      │    │ • content    │    │ • total_facts│
│ • priority   │    │ • status     │    │ • verified   │
│ • source     │    │ • word_count │    │ • failed     │
│ • coins[]    │    │ • model_used │    │ • created_at │
│ • keywords[] │    │ • created_at │    └──────────────┘
│ • created_at │    │ • published  │
│ • processed  │    └──────────────┘
└──────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│generation_   │    │article_      │    │system_       │
│    tasks     │    │ templates    │    │   metrics    │
│              │    │              │    │              │
│ • id (PK)    │    │ • id (PK)    │    │ • metric_name│
│ • task_id    │    │ • name       │    │ • value      │
│ • type       │    │ • category   │    │ • recorded_at│
│ • status     │    │ • structure  │    └──────────────┘
│ • params     │    │ • prompt     │
│ • result     │    │ • created_at │
│ • progress   │    │ • active     │
│ • created_at │    └──────────────┘
└──────────────┘
```

### 主要テーブル詳細

#### 📰 topics テーブル
```sql
CREATE TABLE topics (
    id VARCHAR PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    score FLOAT DEFAULT 0.0,
    priority VARCHAR DEFAULT 'medium', -- urgent/high/medium/low
    source VARCHAR,
    source_url TEXT,
    keywords JSON, -- [{"keyword": str, "relevance": float}]
    coins JSON,   -- ["BTC", "ETH", ...]
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    metadata JSON -- 追加情報
);
```

#### 📄 articles テーブル
```sql
CREATE TABLE articles (
    id VARCHAR PRIMARY KEY,
    topic_id VARCHAR REFERENCES topics(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    html_content TEXT,
    summary TEXT,
    type VARCHAR DEFAULT 'general', -- breaking_news/price_analysis/etc
    status VARCHAR DEFAULT 'draft', -- draft/published/pending
    word_count INTEGER,
    model_used VARCHAR, -- openai-gpt-4/gemini-pro
    generation_params JSON,
    seo_keywords JSON,
    coins JSON,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    wordpress_post_id INTEGER,
    metadata JSON
);
```

#### ✅ fact_check_results テーブル
```sql
CREATE TABLE fact_check_results (
    id SERIAL PRIMARY KEY,
    article_id VARCHAR REFERENCES articles(id),
    reliability_score FLOAT, -- 0-100
    total_facts INTEGER DEFAULT 0,
    verified_facts INTEGER DEFAULT 0,
    failed_facts INTEGER DEFAULT 0,
    detailed_results JSON, -- 詳細な検証結果
    model_used VARCHAR,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 🔄 generation_tasks テーブル
```sql
CREATE TABLE generation_tasks (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR UNIQUE NOT NULL,
    task_type VARCHAR NOT NULL, -- article_generation/fact_check/publish
    status VARCHAR DEFAULT 'pending', -- pending/running/completed/failed
    parameters JSON,
    result JSON,
    progress INTEGER DEFAULT 0, -- 0-100
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

#### 📋 article_templates テーブル
```sql
CREATE TABLE article_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    category VARCHAR, -- news/analysis/educational
    structure JSON, -- セクション構造
    system_prompt TEXT,
    user_prompt_template TEXT,
    default_params JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 📈 system_metrics テーブル
```sql
CREATE TABLE system_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR NOT NULL,
    metric_value FLOAT,
    metric_data JSON, -- 詳細データ
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API エンドポイント仕様

### 認証
すべてのAPIエンドポイントは `X-API-Key` ヘッダーによる認証が必要（OPTIONS・公開エンドポイントを除く）

```http
X-API-Key: your-api-secret-key
Content-Type: application/json
```

### 📊 システム管理 API

#### `GET /api/system/stats`
**システム統計情報取得**

**レスポンス:**
```json
{
  "articlesGenerated": 156,
  "topicsCollected": 1247,
  "templatesCount": 8,
  "systemStatus": "running",
  "lastRun": "2024-01-01T12:00:00Z",
  "dailyQuota": {
    "used": 12,
    "total": 50,
    "resetTime": "2024-01-02T00:00:00Z"
  }
}
```

#### `POST /api/system/control`
**システム制御**

**リクエスト:**
```json
{
  "action": "start" // start/stop/restart
}
```

### 📰 トピック管理 API

#### `GET /api/topics`
**トピック一覧取得**

**クエリパラメータ:**
- `limit`: 取得件数（デフォルト: 50）
- `offset`: オフセット（デフォルト: 0）
- `sortBy`: ソート順（time/score/priority）
- `priority`: 優先度フィルタ（urgent/high/medium/low）
- `source`: ソースフィルタ
- `search`: 検索クエリ

**レスポンス:**
```json
{
  "topics": [
    {
      "id": "topic_12345",
      "title": "Bitcoin reaches new all-time high",
      "content": "...",
      "score": 95.5,
      "priority": "urgent",
      "source": "CoinTelegraph",
      "sourceUrl": "https://...",
      "coins": ["BTC", "ETH"],
      "collectedAt": "2024-01-01T12:00:00Z",
      "processed": false
    }
  ],
  "total": 1247,
  "hasMore": true
}
```

#### `POST /api/topics/collect`
**トピック収集開始**

**レスポンス:**
```json
{
  "taskId": "task_67890",
  "status": "started",
  "message": "Topic collection started"
}
```

#### `PUT /api/topics/{topic_id}`
**トピック更新**

**リクエスト:**
```json
{
  "priority": "high",
  "processed": true
}
```

#### `DELETE /api/topics/{topic_id}`
**トピック削除**

### 📄 記事管理 API

#### `GET /api/articles`
**記事一覧取得**

**クエリパラメータ:**
- `limit`, `offset`: ページネーション
- `status`: ステータスフィルタ（draft/published）
- `type`: 記事タイプフィルタ
- `search`: 検索クエリ

**レスポンス:**
```json
{
  "articles": [
    {
      "id": "article_54321",
      "title": "Comprehensive Bitcoin Analysis",
      "type": "price_analysis",
      "status": "published",
      "wordCount": 1542,
      "generatedAt": "2024-01-01T12:00:00Z",
      "coins": ["BTC"],
      "source": "CoinDesk"
    }
  ],
  "total": 156
}
```

#### `GET /api/articles/{article_id}`
**記事詳細取得**

#### `GET /api/articles/{article_id}/content`
**記事コンテンツ取得**

**レスポンス:**
```json
{
  "id": "article_54321",
  "title": "...",
  "content": "...", // Markdown
  "htmlContent": "...", // HTML
  "wordCount": 1542,
  "seoKeywords": ["bitcoin", "analysis"],
  "factCheckScore": 92.5
}
```

#### `POST /api/articles/generate`
**記事生成開始**

**リクエスト:**
```json
{
  "topicId": "topic_12345",
  "templateId": 1,
  "type": "price_analysis",
  "depth": "comprehensive", // shallow/medium/comprehensive
  "targetWordCount": 1500,
  "includeImages": true,
  "includeCharts": true,
  "tone": "professional", // professional/casual/technical
  "model": "openai-gpt-4", // openai-gpt-4/gemini-pro
  "customKeywords": ["DeFi", "regulation"]
}
```

**レスポンス:**
```json
{
  "taskId": "task_11111",
  "status": "started",
  "estimatedTime": 120 // 秒
}
```

#### `PUT /api/articles/{article_id}`
**記事更新**

#### `DELETE /api/articles/{article_id}`
**記事削除**

#### `POST /api/articles/{article_id}/publish`
**WordPress投稿**

**リクエスト:**
```json
{
  "status": "publish", // draft/publish
  "categories": ["Cryptocurrency", "Analysis"],
  "tags": ["Bitcoin", "BTC"],
  "customTitle": "Custom Post Title",
  "customExcerpt": "Custom excerpt..."
}
```

#### `POST /api/articles/{article_id}/fact-check`
**ファクトチェック実行**

**レスポンス:**
```json
{
  "taskId": "task_22222",
  "status": "started"
}
```

### 📋 テンプレート管理 API

#### `GET /api/templates`
**テンプレート一覧取得**

**レスポンス:**
```json
{
  "templates": [
    {
      "id": 1,
      "name": "Price Analysis Template",
      "category": "analysis",
      "structure": {
        "sections": ["introduction", "analysis", "conclusion"]
      },
      "isActive": true
    }
  ]
}
```

#### `POST /api/templates/{template_id}/use`
**テンプレート使用**

### ⚙️ 設定管理 API

#### `GET /api/settings/config`
**API設定取得**

**レスポンス:**
```json
{
  "openaiApiKey": "sk-...", // マスク済み
  "geminiApiKey": "AI...", // マスク済み
  "wordpressUrl": "https://...",
  "wordpressUsername": "admin",
  "maxDailyArticles": 50,
  "maxHourlyArticles": 10,
  "defaultModel": "openai-gpt-4",
  "factCheckEnabled": true
}
```

#### `POST /api/settings/config`
**API設定更新**

#### `POST /api/settings/test-connection`
**API接続テスト**

**リクエスト:**
```json
{
  "service": "openai", // openai/gemini/wordpress
  "apiKey": "...",
  "endpoint": "https://..."
}
```

### 🔄 タスク管理 API

#### `GET /api/tasks/{task_id}/status`
**タスクステータス確認**

**レスポンス:**
```json
{
  "taskId": "task_11111",
  "type": "article_generation",
  "status": "completed", // pending/running/completed/failed
  "progress": 100, // 0-100
  "result": {
    "articleId": "article_54321",
    "wordCount": 1542
  },
  "createdAt": "2024-01-01T12:00:00Z",
  "completedAt": "2024-01-01T12:02:15Z"
}
```

### 📊 WordPress連携 API

#### `GET /api/wordpress/config`
**WordPress設定取得**

#### `POST /api/wordpress/test`
**WordPress接続テスト**

### 📜 ログ・監視 API

#### `GET /api/logs`
**システムログ取得**

**クエリパラメータ:**
- `level`: ログレベル（INFO/WARNING/ERROR）
- `since`: 開始時刻
- `limit`: 取得件数

---

## 🎨 フロントエンド UI仕様

### レスポンシブデザイン
- **モバイルファースト**: 最小320px幅から対応
- **ブレークポイント**: sm(640px), md(768px), lg(1024px), xl(1280px)
- **タッチ最適化**: 最小44pxのタッチターゲット

### 色彩システム

#### ダークモード（デフォルト）
- **背景**: gray-950 → slate-900 グラデーション
- **カード**: gray-800/40 → gray-900/40
- **テキスト**: white/gray-300
- **アクセント**: blue-600, purple-600, emerald-600

#### ライトモード
- **背景**: blue-50 → white → indigo-50 グラデーション
- **カード**: white/70 → blue-50/50
- **テキスト**: gray-800/gray-700
- **アクセント**: blue-600, purple-600, emerald-600

### 画面構成

#### 📊 メインダッシュボード
- **ナビゲーションバー**:
  - ロゴ・ブランディング
  - 検索機能（⌘K コマンドパレット）
  - テーマ切替
  - システム制御ボタン
  - モバイルハンバーガーメニュー

- **統計カード** (5列グリッド):
  1. 記事生成数
  2. トピック収集数
  3. テンプレート数
  4. システム状態
  5. 日次クォータ

- **タブナビゲーション**:
  - Topics（トピック監視）
  - Articles（記事管理）
  - Generate（AI生成）
  - Settings（設定）

#### 📰 Topics タブ
- **ヘッダー**: "Real-time Topic Intelligence"
- **ライブインジケーター**: WiFi アイコン + "Live"
- **トピックカード**:
  - 優先度バッジ（urgent🚨/high⚡/medium📊/low📈）
  - スコア表示
  - 収集時刻
  - コイン・キーワードタグ
  - ソース情報
  - 記事生成ボタン
- **無限スクロール対応**

#### 📄 Articles タブ
- **ヘッダー**: "Content Management Hub"
- **記事カード**:
  - ステータスバッジ（公開済み/承認待ち/下書き）
  - 文字数・生成日時
  - タイプ・コインタグ
  - アクションボタン（プレビュー/編集/公開/削除）
- **ステータス変更機能**

#### ⚡ Generate タブ
- **ヘッダー**: "AI Generation Studio"
- **記事生成フォーム**:
  - トピック選択
  - テンプレート選択
  - 記事タイプ設定
  - 深度設定（shallow/medium/comprehensive）
  - 目標文字数
  - AIモデル選択
  - 詳細オプション（画像・チャート含有、トーン）

#### ⚙️ Settings タブ
- **API設定**:
  - OpenAI API キー
  - Gemini API キー
  - WordPress 接続情報
- **ソース管理**:
  - RSS フィード設定
  - 優先度設定
- **システム設定**:
  - 生成制限
  - スケジュール設定
  - ファクトチェック設定

### モバイル対応

#### ハンバーガーメニュー
- **サイドドロワー**: shadcn/ui Sheet コンポーネント
- **モバイル検索**: サイドメニュー内に統合
- **ナビゲーション**: 全機能にアクセス可能
- **アクションボタン**: システム制御・テーマ変更

#### レスポンシブグリッド
- **StatCards**: 1列→2列→5列
- **TopicList**: 1列→2列→3列
- **ArticleList**: 1列→2列

#### タッチ最適化
- **最小タッチターゲット**: 44px以上
- **インタラクション**: `active:scale-95`, `touch-manipulation`
- **スワイプ**: 適切なスクロール・ナビゲーション

### アニメーション・エフェクト

#### ホバー効果
- **カード**: `hover:scale-105` + シャドウ
- **ボタン**: グラデーション変化
- **シャイン効果**: 光る演出

#### ローディング状態
- **スケルトン**: コンテンツ形状を模した読み込み表示
- **プログレスバー**: タスク進捗表示
- **スピナー**: 非同期処理待機

#### トランジション
- **テーマ切替**: 700ms smooth transition
- **タブ切替**: 300ms duration
- **モーダル**: fade-in/out + scale

---

## 🔄 主要ワークフロー

### 1. トピック収集フロー
```mermaid
graph LR
    A[スケジューラー] -->|30分間隔| B[RSS収集]
    B --> C[価格データ収集]
    C --> D[スコアリング]
    D --> E[重複排除]
    E --> F[データベース保存]
    F --> G[WebUI更新]
```

**収集ソース:**
- CoinTelegraph RSS
- CoinDesk RSS  
- Decrypt RSS
- Bitcoin Magazine RSS
- CoinPost RSS (日本語)
- Crypto Watch Impress RSS (日本語)
- CoinGecko API (価格データ)

**スコアリング要因:**
- キーワード関連性
- コイン言及数
- ソース信頼性
- 時事性
- 価格変動相関

### 2. 記事生成フロー
```mermaid
graph TD
    A[トピック選択] --> B[テンプレート選択]
    B --> C[パラメータ設定]
    C --> D[AI API呼び出し]
    D --> E[コンテンツ生成]
    E --> F[ファクトチェック]
    F --> G[保存・プレビュー]
    G --> H[WordPress投稿]
```

**生成パラメータ:**
- **記事タイプ**: breaking_news, price_analysis, technical_analysis, market_overview, educational
- **深度**: shallow (500-800語), medium (800-1200語), comprehensive (1200-2000語)
- **AIモデル**: OpenAI GPT-4, Google Gemini Pro
- **トーン**: professional, casual, technical
- **追加要素**: 画像, チャート, SEOキーワード

### 3. ファクトチェックフロー
```mermaid
graph TD
    A[記事解析] --> B[事実抽出]
    B --> C[ソース検証]
    C --> D[信頼性判定]
    D --> E[スコア算出]
    E --> F[結果保存]
```

**検証項目:**
- 価格データの正確性
- 事実情報の検証
- 引用元の信頼性
- 数値データの妥当性
- 時系列の整合性

### 4. WordPress投稿フロー
```mermaid
graph TD
    A[記事選択] --> B[投稿設定]
    B --> C[カテゴリ・タグ設定]
    C --> D[XML-RPC接続]
    D --> E[記事投稿]
    E --> F[ステータス更新]
```

---

## 🔐 セキュリティ仕様

### API認証
- **方式**: API Key認証
- **ヘッダー**: `X-API-Key`
- **スコープ**: 全APIエンドポイント（公開エンドポイント除く）

### データ暗号化
- **APIキー**: Fernet暗号化による保存
- **パスワード**: 環境変数による管理
- **通信**: HTTPS/TLS強制

### レート制限
- **API呼び出し**: サービス別制限設定
- **記事生成**: 日次50記事、時間10記事制限
- **トピック収集**: 30分間隔制限

### CORS設定
- **許可オリジン**: 設定可能な許可リスト
- **許可メソッド**: GET, POST, PUT, DELETE, OPTIONS
- **許可ヘッダー**: Content-Type, Authorization, X-API-Key

---

## 📈 パフォーマンス最適化

### バックエンド最適化

#### データベース
- **インデックス**: 主要検索カラムに最適化インデックス
- **ページネーション**: OFFSET/LIMIT による効率的取得
- **コネクションプール**: SQLAlchemy によるプール管理

#### キャッシュ戦略
- **Redis**: トピック・記事データの30分キャッシュ
- **メモリキャッシュ**: API設定の in-memory キャッシュ
- **ETags**: 静的リソースのブラウザキャッシュ

#### 非同期処理
- **Celery**: 重い処理のバックグラウンド実行
- **タスクキュー**: Redis をブローカーとした分散処理
- **プログレス追跡**: リアルタイム進捗表示

### フロントエンド最適化

#### React最適化
- **React.memo**: 不要な再レンダリング防止
- **useCallback**: 関数メモ化
- **React Query**: サーバー状態管理・キャッシュ
- **Intersection Observer**: 無限スクロール最適化

#### バンドル最適化
- **Next.js Tree Shaking**: 未使用コード除去
- **動的インポート**: コード分割
- **Image最適化**: Next.js Image component活用

#### レスポンシブ最適化
- **モバイルファースト**: 最小サイズからのプログレッシブ強化
- **Touch最適化**: 44px以上のタッチターゲット
- **レイジーローディング**: 画像・コンポーネントの遅延読み込み

---

## 🚀 デプロイメント

### 開発環境

#### 必要な環境変数
```bash
# .env ファイル
# API設定
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AI...
API_SECRET_KEY=your-secret-key

# WordPress設定  
WORDPRESS_URL=https://your-site.com
WORDPRESS_USERNAME=admin
WORDPRESS_PASSWORD=password

# データベース
DATABASE_URL=postgresql://user:pass@localhost/dbname
REDIS_URL=redis://localhost:6379

# Next.js設定
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_SECRET_KEY=your-secret-key
```

#### 起動手順
```bash
# 1. 依存関係インストール
pip install -r requirements.txt
cd crypto-article-system && npm install

# 2. データベース初期化
alembic upgrade head

# 3. Redis起動
redis-server

# 4. バックエンド起動
python api_server.py

# 5. フロントエンド起動（別ターミナル）
cd crypto-article-system && npm run dev
```

### 本番環境（Docker）

#### docker-compose.yml
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db/crypto_articles
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  frontend:
    build: ./crypto-article-system
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000

  db:
    image: postgres:13
    environment:
      POSTGRES_DB: crypto_articles
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  celery:
    build: .
    command: celery -A celery_app worker --loglevel=info
    depends_on:
      - redis
      - db

volumes:
  postgres_data:
  redis_data:
```

#### デプロイ手順
```bash
# 1. 環境変数設定
cp .env.example .env
# .envファイルを編集

# 2. Docker起動
docker-compose up -d

# 3. データベースマイグレーション
docker-compose exec backend alembic upgrade head

# 4. 初期データ投入（オプション）
docker-compose exec backend python scripts/init_data.py
```

---

## 📊 監視・ログ

### ログ出力
- **レベル**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **フォーマット**: 構造化JSON形式
- **出力先**: ファイル + 標準出力
- **ローテーション**: 日次ローテーション、7日間保持

### メトリクス収集
- **システムメトリクス**: CPU、メモリ、ディスク使用量
- **アプリケーションメトリクス**: API応答時間、エラー率
- **ビジネスメトリクス**: 記事生成数、ファクトチェック成功率

### アラート設定
- **エラー率**: 5%以上でアラート
- **応答時間**: 5秒以上でアラート
- **リソース使用率**: 80%以上でアラート

---

## 🔮 今後の拡張計画

### Phase 2: 機械学習強化
- **品質評価モデル**: 記事品質の自動評価AI
- **ユーザーフィードバック学習**: 読者反応による品質向上
- **カスタム生成モデル**: ドメイン特化型の学習済みモデル

### Phase 3: マルチ言語対応
- **自動翻訳**: 記事の多言語展開
- **地域特化**: 各地域の規制・文化に合わせた内容調整
- **多言語ソース**: 各国の暗号通貨ニュースソース統合

### Phase 4: 高度な分析
- **SEO最適化**: 検索エンジン最適化の自動提案
- **競合分析**: 他サイトとの差別化分析
- **読者行動分析**: PV・滞在時間・コンバージョン分析

### Phase 5: エコシステム拡張
- **ソーシャルメディア連携**: Twitter/X自動投稿
- **Podcast生成**: 音声コンテンツの自動生成
- **動画要約**: YouTubeコンテンツの自動要約
- **Newsletter配信**: メール配信機能統合

---

## 📞 サポート・メンテナンス

### 定期メンテナンス
- **データベース**: 月次バックアップ・最適化
- **ログ**: 週次ローテーション・アーカイブ
- **依存関係**: 月次セキュリティアップデート
- **API制限**: 四半期ごとの制限見直し

### トラブルシューティング

#### よくある問題
1. **API接続エラー**: APIキーの有効性確認
2. **記事生成失敗**: モデル制限・プロンプト調整
3. **WordPress投稿失敗**: 認証情報・URL確認
4. **パフォーマンス低下**: Redis・データベース最適化

#### デバッグ手順
```bash
# ログ確認
tail -f api_server.log

# タスク状況確認
celery -A celery_app inspect active

# データベース接続確認
python -c "from src.database import get_db_session; print('DB OK')"

# Redis接続確認
redis-cli ping
```

---

## 📋 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0.0 | 2024-01-01 | 初期リリース |
| 1.1.0 | 2024-01-15 | モバイル対応追加 |
| 1.2.0 | 2024-02-01 | API認証機能追加 |
| 1.3.0 | 2024-02-15 | ファクトチェック機能強化 |

---

## 📄 ライセンス・著作権

**開発者**: Claude Code (Anthropic) + Human Developer  
**ライセンス**: MIT License  
**著作権**: © 2024 CryptoAI Pro Development Team

---

*この仕様書は CryptoAI Pro - 暗号通貨記事自動生成システムの包括的な技術仕様を記載しています。システムの理解・開発・運用の参考として活用してください。*

---

**📝 ドキュメント最終更新**: 2024年1月1日  
**📧 お問い合わせ**: 開発チームまでご連絡ください  
**🔗 リポジトリ**: https://github.com/shingo25/crypto-article-system