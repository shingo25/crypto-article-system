# 暗号通貨記事自動生成システム MVP

暗号通貨に関する記事を自動生成し、WordPressに下書きとして投稿するシステムのMVP実装です。

## 機能

- 複数の記事タイプに対応（速報、価格分析、技術分析、教育記事など）
- 記事の深度管理（浅い/中程度/深い）
- 文字数管理
- HTML形式での出力
- WordPress連携準備

## セットアップ

### 1. 環境準備

```bash
# Pythonの仮想環境を作成
python -m venv venv

# 仮想環境を有効化
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# 依存関係をインストール
pip install -r requirements.txt
```

### 2. 環境変数の設定

`.env.example`を`.env`にコピーして、必要な情報を設定：

```bash
cp .env.example .env
```

`.env`ファイルを編集：
```
OPENAI_API_KEY=your_actual_openai_api_key
```

### 3. 実行

```bash
python crypto-article-generator-mvp.py
```

## 使用方法

### 基本的な使用例

```python
from crypto_article_generator_mvp import (
    CryptoArticleGenerator, 
    ArticleTopic, 
    ArticleType, 
    ArticleDepth
)

# 記事生成器を初期化
generator = CryptoArticleGenerator(llm_provider="openai")

# トピックを定義
topic = ArticleTopic(
    title="ビットコインの半減期が市場に与える影響",
    coin_symbol="BTC",
    coin_name="ビットコイン",
    article_type=ArticleType.EDUCATIONAL,
    depth=ArticleDepth.DEEP,
    keywords=["ビットコイン", "半減期", "マイニング", "価格予測"]
)

# 記事を生成
article = generator.generate_article(topic)

# ファイルに保存
generator.save_article(article)
```

## 出力ファイル

生成された記事は`output`ディレクトリに保存されます：

- `YYYYMMDD_HHMMSS_BTC_breaking_news.txt` - プレーンテキスト版
- `YYYYMMDD_HHMMSS_BTC_breaking_news.html` - HTML版
- `YYYYMMDD_HHMMSS_BTC_breaking_news_metadata.json` - メタデータ

## 次のステップ

1. **WordPress連携の実装**
   - REST APIを使用した自動投稿
   - カテゴリ・タグの自動設定

2. **ネタ収集の自動化**
   - RSSフィードからの情報収集
   - 価格APIとの連携

3. **ファクトチェック機能**
   - 価格データの自動検証
   - 情報源の確認

4. **スケーリング**
   - Celeryによるタスクキュー実装
   - 並列処理による大量生成

## 注意事項

- API使用量には制限があります
- 生成された記事は必ず人間がレビューしてください
- 投資アドバイスとして使用しないでください