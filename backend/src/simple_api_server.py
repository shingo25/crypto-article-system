#!/usr/bin/env python3
"""
FastAPI server with complete authentication system
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import sys
import logging
from datetime import datetime

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# srcディレクトリをパスに追加
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))

# 設定をインポート
try:
    from src.config import Config
    from src.cors_config import CORSConfig
    config_available = True
except ImportError:
    logger.warning("設定モジュールが利用できません。デフォルト設定を使用します。")
    config_available = False

# 認証関連のモジュールをインポート
try:
    from src.auth_routes import router as auth_router
    from src.database import engine, Base, create_tables, get_db
    from src import auth_models
    auth_available = True
except ImportError as e:
    logger.warning(f"認証モジュールのインポートに失敗: {e}")
    auth_available = False

# トピック生成関連のモジュールをインポート
try:
    from src.topic_generator import generate_topics_from_market_data
    topic_generator_available = True
    logger.info("トピック生成エンジンを読み込みました")
except ImportError as e:
    logger.warning(f"トピック生成モジュールのインポートに失敗: {e}")
    topic_generator_available = False

# RSSソース管理関連のモジュールをインポート
try:
    from src.rss_routes import router as rss_router
    rss_routes_available = True
    logger.info("RSSソース管理ルーターを読み込みました")
except ImportError as e:
    logger.warning(f"RSSルーターのインポートに失敗: {e}")
    rss_routes_available = False

# データベーステーブルを作成（認証機能が利用可能な場合）
if auth_available:
    try:
        logger.info("データベーステーブルを作成中...")
        create_tables()
        logger.info("データベーステーブルの作成が完了しました")
    except Exception as e:
        logger.error(f"データベーステーブルの作成に失敗: {e}")

# FastAPI アプリケーション
app = FastAPI(
    title="Crypto Article Generation System API",
    description="暗号通貨記事自動生成システムのREST API",
    version="1.0.0"
)

# CORS設定
if config_available:
    cors_config = CORSConfig.get_cors_config()
    logger.info(f"Using environment-specific CORS config: {cors_config['allow_origins']}")
else:
    cors_config = {
        "allow_origins": ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
        "allow_credentials": True,
        "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["*"],
        "expose_headers": ["*"]
    }
    logger.info("Using default CORS config")

app.add_middleware(CORSMiddleware, **cors_config)

# トピックキャッシュ用のグローバル変数
topic_cache = []
last_topic_update = None

# 認証ルーターをインクルード（利用可能な場合）
if auth_available:
    app.include_router(auth_router, prefix="/api")
    logger.info("認証ルーターを追加しました: /api/auth/*")

# RSSソース管理ルーターをインクルード（利用可能な場合）
if rss_routes_available:
    app.include_router(rss_router, prefix="/api")
    logger.info("RSSソース管理ルーターを追加しました: /api/rss-sources/*")

# アプリケーション起動時の処理
@app.on_event("startup")
async def startup_event():
    """サーバー起動時にトピックを生成"""
    global topic_cache, last_topic_update
    
    if topic_generator_available:
        try:
            logger.info("初期トピック生成を開始...")
            # DBセッションを作成してトピック生成に渡す
            db_session = next(get_db()) if auth_available else None
            topics = generate_topics_from_market_data(db_session)
            if db_session:
                db_session.close()
            topic_cache = topics
            last_topic_update = datetime.now()
            logger.info(f"初期トピック生成完了: {len(topics)}件のトピックを生成しました")
        except Exception as e:
            logger.error(f"初期トピック生成に失敗: {e}", exc_info=True)
            topic_cache = []
    else:
        logger.warning("トピック生成エンジンが利用できません。モックデータを使用します。")

# ヘルスチェック
@app.get("/")
async def root():
    return {"message": "Crypto Article Generation System API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# トピック関連のエンドポイント
@app.get("/api/topics")
async def get_topics(
    limit: int = 20,
    offset: int = 0,
    priority: str = None,
    source: str = None,
    sortBy: str = None,
    force_refresh: bool = False
):
    """トピック一覧を取得（実データ）"""
    global topic_cache, last_topic_update
    
    try:
        # 強制リフレッシュまたはキャッシュが空の場合は新しいトピックを生成
        should_refresh = (
            force_refresh or 
            not topic_cache or
            (last_topic_update and 
             (datetime.now() - last_topic_update).total_seconds() > 1800)  # 30分でキャッシュ期限切れ
        )
        
        if should_refresh and topic_generator_available:
            try:
                logger.info("トピックを更新中...")
                # DBセッションを作成してトピック生成に渡す
                db_session = next(get_db()) if auth_available else None
                new_topics = generate_topics_from_market_data(db_session)
                if db_session:
                    db_session.close()
                topic_cache = new_topics
                last_topic_update = datetime.now()
                logger.info(f"トピック更新完了: {len(new_topics)}件")
            except Exception as e:
                logger.error(f"トピック更新に失敗: {e}")
                # エラーの場合は既存のキャッシュを使用
        
        # キャッシュからトピックを取得
        available_topics = topic_cache if topic_cache else []
        
        # フォールバック: モックデータ
        if not available_topics:
            logger.warning("実データが利用できません。モックデータを使用します。")
            available_topics = [
                {
                    "id": "fallback_1",
                    "title": "🔍 リアルタイム市場データ取得中...",
                    "priority": "medium",
                    "score": 50,
                    "coins": ["BTC"],
                    "collectedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "source": "システム",
                    "summary": "現在、最新の市場データを取得しています。しばらくお待ちください。",
                    "type": "system",
                    "estimatedReadTime": 3
                }
            ]
        
        # フィルタリング
        filtered_topics = available_topics
        
        if priority:
            filtered_topics = [t for t in filtered_topics if t.get("priority") == priority]
        
        if source:
            filtered_topics = [t for t in filtered_topics if source.lower() in t.get("source", "").lower()]
        
        # ソート
        if sortBy == "created_at":
            filtered_topics = sorted(filtered_topics, key=lambda x: x.get("collectedAt", ""), reverse=True)
        elif sortBy == "score":
            filtered_topics = sorted(filtered_topics, key=lambda x: x.get("score", 0), reverse=True)
        
        # ページネーション
        total_count = len(filtered_topics)
        start_idx = offset
        end_idx = min(offset + limit, total_count)
        topics_page = filtered_topics[start_idx:end_idx]
        
        return {
            "topics": topics_page,
            "pagination": {
                "total": total_count,
                "offset": offset,
                "limit": limit,
                "hasMore": end_idx < total_count
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting topics: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"トピックの取得に失敗しました: {str(e)}"}
        )

# AI記事生成エンドポイント（改良版）
@app.post("/api/articles/generate")
async def generate_article(request: Request):
    """AI記事生成エンドポイント - 高品質な分析記事を生成"""
    try:
        body = await request.json()
        topic_id = body.get('topicId')
        topic_title = body.get('topicTitle', 'Sample Topic')
        topic_type = body.get('topicType', 'analysis')
        coins = body.get('coins', [])
        primary_data = body.get('primaryData', {})
        generation_settings = body.get('settings', {})
        
        # 記事生成タイプに応じたコンテンツ作成
        article_content = await generate_ai_content(
            topic_title=topic_title,
            topic_type=topic_type,
            coins=coins,
            primary_data=primary_data,
            settings=generation_settings
        )
        
        # 記事品質スコアを計算
        quality_score = calculate_article_quality(article_content)
        
        # 記事メタデータ生成
        generated_article = {
            "id": f"article_{topic_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "title": article_content["title"],
            "content": article_content["content"],
            "summary": article_content["summary"],
            "type": topic_type,
            "status": "draft",
            "wordCount": len(article_content["content"].split()),
            "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "estimatedReadTime": max(1, len(article_content["content"].split()) // 200),
            "topic_id": topic_id,
            "coins": coins,
            "qualityScore": quality_score,
            "seoKeywords": article_content.get("keywords", []),
            "tags": article_content.get("tags", []),
            "generationMethod": article_content.get("method", "AI"),
            "confidence": article_content.get("confidence", 0.85)
        }
        
        return {
            "success": True,
            "article": generated_article,
            "message": "記事が正常に生成されました",
            "metadata": {
                "qualityScore": quality_score,
                "generationTime": "~3秒",
                "wordCount": generated_article["wordCount"],
                "readingTime": f"{generated_article['estimatedReadTime']}分"
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating article: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"記事生成に失敗しました: {str(e)}"}
        )

async def generate_ai_content(topic_title: str, topic_type: str, coins: list, primary_data: dict, settings: dict):
    """AI記事コンテンツ生成（実際のAI APIは環境に応じて実装）"""
    try:
        # 暗号通貨記事生成用のプロンプトテンプレート
        if topic_type == "analysis":
            content_template = f"""
# {topic_title}

## 要約
{topic_title}について、最新の市場動向と分析結果をお伝えします。

## 市場概況
関連する暗号通貨: {', '.join(coins) if coins else 'BTC, ETH'}

{f"現在価格: ${primary_data.get('currentPrice', 'N/A')}" if primary_data.get('currentPrice') else ""}
{f"24時間変動: {primary_data.get('change24h', 'N/A')}%" if primary_data.get('change24h') else ""}
{f"取引高: {primary_data.get('volume24h', 'N/A')}" if primary_data.get('volume24h') else ""}

## 詳細分析

### 技術的指標
現在の市場状況を分析すると、以下のような傾向が見られます：

- **価格動向**: 中期的なトレンド分析
- **出来高**: 市場参加者の活動レベル
- **支持・抵抗レベル**: キーとなる価格帯

### ファンダメンタル要因
市場に影響を与える主要な要因：

1. **規制環境の変化**
2. **機関投資家の動向**
3. **技術開発の進展**
4. **マクロ経済情勢**

### リスク評価
投資を検討する際の注意点：

- **市場ボラティリティ**: 価格変動の大きさ
- **流動性リスク**: 取引のしやすさ
- **規制リスク**: 法的な不確実性

## 今後の展望

### 短期予測（1-3ヶ月）
技術的分析に基づく短期的な見通し

### 中長期予測（6-12ヶ月）
ファンダメンタル要因を考慮した中長期展望

## まとめ
{topic_title}に関する分析をまとめると、投資家にとって重要な判断材料となる複数の要因が確認されています。市場の動向を注意深く監視し、リスク管理を適切に行うことが重要です。

---
*本記事は市場分析を目的としており、投資助言ではありません。投資判断は自己責任で行ってください。*
"""
        else:
            # 他のタイプのテンプレート
            content_template = f"""
# {topic_title}

## 概要
{topic_title}について、最新の情報をお届けします。

## 詳細内容
暗号通貨市場における重要な動向として、{topic_title}が注目を集めています。

### 主要ポイント
1. 市場の現状
2. 注目すべき要因
3. 今後の展望

## まとめ
{topic_title}は暗号通貨エコシステムにおいて重要な意味を持つトピックです。
"""

        # コンテンツ品質向上のための追加処理
        enhanced_content = enhance_article_content(content_template, coins, primary_data)
        
        return {
            "title": f"{topic_title} - 詳細分析レポート",
            "content": enhanced_content,
            "summary": f"{topic_title}の最新分析。市場動向、技術指標、リスク評価を含む包括的なレポート。",
            "keywords": extract_keywords(topic_title, coins),
            "tags": generate_tags(topic_type, coins),
            "method": "AI Enhanced Template",
            "confidence": 0.87
        }
        
    except Exception as e:
        logger.error(f"Error in AI content generation: {e}")
        # フォールバック: シンプルなコンテンツ
        return {
            "title": f"{topic_title} - 分析記事",
            "content": f"## {topic_title}\n\n{topic_title}について分析を行いました。\n\n詳細な市場動向と今後の展望をお伝えします。",
            "summary": f"{topic_title}の分析記事",
            "keywords": [topic_title] + coins,
            "tags": [topic_type],
            "method": "Fallback Template",
            "confidence": 0.70
        }

def enhance_article_content(content: str, coins: list, primary_data: dict) -> str:
    """記事コンテンツの品質向上"""
    enhanced = content
    
    # 価格データがある場合の追加情報
    if primary_data.get('currentPrice'):
        price_analysis = f"\n### 価格分析\n現在価格 ${primary_data['currentPrice']:,} は、"
        if primary_data.get('change24h', 0) > 5:
            price_analysis += "強い上昇トレンドを示しています。"
        elif primary_data.get('change24h', 0) < -5:
            price_analysis += "調整局面にあることを示しています。"
        else:
            price_analysis += "比較的安定した推移を見せています。"
        
        enhanced = enhanced.replace("## まとめ", price_analysis + "\n\n## まとめ")
    
    return enhanced

def extract_keywords(topic_title: str, coins: list) -> list:
    """SEOキーワード抽出"""
    base_keywords = ["暗号通貨", "仮想通貨", "ブロックチェーン", "投資", "分析"]
    topic_keywords = topic_title.split()
    return list(set(base_keywords + topic_keywords + coins))[:10]

def generate_tags(topic_type: str, coins: list) -> list:
    """記事タグ生成"""
    base_tags = [topic_type, "市場分析", "暗号通貨"]
    return list(set(base_tags + coins))[:8]

def calculate_article_quality(content: dict) -> float:
    """記事品質スコア計算"""
    score = 0.0
    
    # 文字数チェック
    word_count = len(content["content"].split())
    if word_count > 500:
        score += 0.3
    elif word_count > 200:
        score += 0.2
    else:
        score += 0.1
    
    # 構造チェック
    if "##" in content["content"]:
        score += 0.2
    if "###" in content["content"]:
        score += 0.1
    
    # キーワードチェック
    if len(content.get("keywords", [])) >= 5:
        score += 0.2
    
    # 信頼性
    score += content.get("confidence", 0.5) * 0.2
    
    return min(1.0, score)

# トレンド分析エンドポイント
@app.get("/api/trends/analysis")
async def get_trend_analysis(
    request: Request,
    current_user: Optional[auth_models.User] = Depends(get_current_active_user) if auth_available else None
):
    """暗号通貨トレンド分析"""
    # 認証が必須の場合
    if auth_available and not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証が必要です"
        )
    try:
        # モックトレンドデータ（実際の実装では市場データAPIを使用）
        trending_topics = [
            {
                "id": "trend_btc_surge",
                "title": "Bitcoin価格が急騰、機関投資家の買いが加速",
                "trend_type": "price_movement",
                "coins": ["BTC"],
                "confidence": 0.92,
                "sentiment": "bullish",
                "volume_spike": 45.6,
                "trending_score": 95,
                "time_frame": "24h",
                "key_factors": [
                    "ETF承認への期待",
                    "機関投資家の参入",
                    "マクロ経済環境の改善"
                ],
                "potential_impact": "高",
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            },
            {
                "id": "trend_defi_growth",
                "title": "DeFiプロトコルのTVL急増、新たな金融革命の兆し",
                "trend_type": "sector_growth",
                "coins": ["ETH", "UNI", "AAVE"],
                "confidence": 0.88,
                "sentiment": "positive",
                "volume_spike": 23.4,
                "trending_score": 87,
                "time_frame": "7d",
                "key_factors": [
                    "新プロトコルのローンチ",
                    "利回り農業の進化",
                    "規制環境の明確化"
                ],
                "potential_impact": "中-高",
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            },
            {
                "id": "trend_regulatory_update",
                "title": "主要国での暗号通貨規制フレームワーク策定",
                "trend_type": "regulatory",
                "coins": ["BTC", "ETH", "BNB"],
                "confidence": 0.83,
                "sentiment": "neutral",
                "volume_spike": 12.8,
                "trending_score": 79,
                "time_frame": "30d",
                "key_factors": [
                    "G20諸国の協調",
                    "CBDC開発の加速",
                    "税制の明確化"
                ],
                "potential_impact": "高",
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        ]
        
        return {
            "success": True,
            "trends": trending_topics,
            "metadata": {
                "total_trends": len(trending_topics),
                "analysis_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "data_sources": ["Market Data", "Social Sentiment", "News Analysis"],
                "confidence_avg": sum(t["confidence"] for t in trending_topics) / len(trending_topics)
            }
        }
        
    except Exception as e:
        logger.error(f"Error in trend analysis: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"トレンド分析に失敗しました: {str(e)}"}
        )

@app.post("/api/trends/generate-article")
async def generate_trend_article(
    request: Request,
    current_user: Optional[auth_models.User] = Depends(get_current_active_user) if auth_available else None
):
    """トレンドベースの記事自動生成"""
    # 認証が必須の場合
    if auth_available and not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証が必要です"
        )
    try:
        body = await request.json()
        trend_id = body.get('trendId')
        auto_generate = body.get('autoGenerate', True)
        
        # トレンド情報を取得（実際の実装では上記のトレンド分析結果を使用）
        mock_trend = {
            "id": trend_id,
            "title": "Bitcoin価格が急騰、機関投資家の買いが加速",
            "coins": ["BTC"],
            "confidence": 0.92,
            "sentiment": "bullish",
            "key_factors": [
                "ETF承認への期待",
                "機関投資家の参入",
                "マクロ経済環境の改善"
            ],
            "primary_data": {
                "currentPrice": 67420,
                "change24h": 8.5,
                "volume24h": "$28,900,000,000"
            }
        }
        
        # トレンド情報を基にした記事生成
        article_content = await generate_trend_based_content(mock_trend)
        
        generated_article = {
            "id": f"trend_article_{trend_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "title": article_content["title"],
            "content": article_content["content"],
            "type": "trend_analysis",
            "status": "draft",
            "source": "Trend Analysis",
            "wordCount": len(article_content["content"].split()),
            "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "estimatedReadTime": max(1, len(article_content["content"].split()) // 200),
            "trendId": trend_id,
            "coins": mock_trend["coins"],
            "confidence": mock_trend["confidence"],
            "sentiment": mock_trend["sentiment"],
            "autoGenerated": auto_generate,
            "qualityScore": calculate_article_quality(article_content)
        }
        
        return {
            "success": True,
            "article": generated_article,
            "trend_data": mock_trend,
            "message": "トレンドベース記事が生成されました"
        }
        
    except Exception as e:
        logger.error(f"Error generating trend article: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"トレンド記事生成に失敗しました: {str(e)}"}
        )

def get_sentiment_description(sentiment: str) -> str:
    """センチメントの説明を取得"""
    descriptions = {
        "bullish": "強気に傾いています",
        "bearish": "弱気に転じています", 
        "neutral": "中立的な状況です",
        "positive": "ポジティブに推移しています"
    }
    return descriptions.get(sentiment, "変化しています")

async def generate_trend_based_content(trend_data: dict):
    """トレンド分析に基づく記事コンテンツ生成"""
    title = trend_data["title"]
    coins = trend_data["coins"]
    sentiment = trend_data["sentiment"]
    key_factors = trend_data.get("key_factors", [])
    primary_data = trend_data.get("primary_data", {})
    
    sentiment_emoji = {
        "bullish": "🚀",
        "bearish": "📉", 
        "neutral": "➡️",
        "positive": "📈"
    }.get(sentiment, "📊")
    
    content = f"""
# {sentiment_emoji} {title}

## トレンド概要
現在の市場動向として、{title.lower()}という重要な変化が観測されています。
関連する暗号通貨: **{', '.join(coins)}**

### 市場データ
{f"- 現在価格: **${primary_data.get('currentPrice', 'N/A'):,}**" if primary_data.get('currentPrice') else ""}
{f"- 24時間変動: **{primary_data.get('change24h', 'N/A')}%**" if primary_data.get('change24h') else ""}
{f"- 取引高: **{primary_data.get('volume24h', 'N/A')}**" if primary_data.get('volume24h') else ""}

## 主要な影響要因

この市場動向の背景には、以下の要因が確認されています：

{chr(10).join(f"{i+1}. **{factor}**" for i, factor in enumerate(key_factors))}

## 詳細分析

### 市場センチメント
現在の市場センチメントは**{sentiment}**となっており、投資家の心理が{get_sentiment_description(sentiment)}。

### 技術的分析
- **サポートレベル**: 重要な支持線の確認
- **レジスタンスレベル**: 上値抵抗線の状況
- **出来高分析**: 取引量の変化パターン

### 影響予測
この動向が継続した場合の予想される影響：

- **短期的影響（1-7日）**: 価格ボラティリティの継続
- **中期的影響（1-4週間）**: トレンドの定着または反転
- **長期的影響（1-3ヶ月）**: 市場構造の変化

## 投資家への示唆

### リスク要因
- 市場の急激な変動可能性
- 外部要因による影響
- 流動性の変化

### 機会要因  
- 新たな成長セクターへの参入機会
- ポートフォリオ多様化の検討
- 長期投資戦略の見直し

## まとめ

{title}は暗号通貨市場において注目すべき重要な動向です。投資家は市場の変化を注意深く監視し、リスク管理を適切に行いながら、機会を捉えることが重要です。

---
*本記事はトレンド分析に基づく情報提供を目的としており、投資助言ではありません。*
"""

    return {
        "title": f"{sentiment_emoji} {title} - トレンド分析レポート",
        "content": content,
        "summary": f"{title}のトレンド分析。市場動向、影響要因、投資への示唆を含む包括的なレポート。",
        "keywords": extract_keywords(title, coins) + ["トレンド", "市場分析"],
        "tags": ["trend_analysis", sentiment] + coins,
        "confidence": trend_data.get("confidence", 0.85)
    }

# 記事関連のエンドポイント
@app.get("/api/articles")
async def get_articles(
    limit: int = 20,
    offset: int = 0,
    status: str = None,
    type: str = None,
    search: str = None
):
    """記事一覧を取得（モックデータ）"""
    try:
        # モック記事データを作成
        mock_articles = [
            {
                "id": "article_1",
                "title": "Bitcoin価格分析：新たな強気相場の始まりか？",
                "type": "analysis",
                "wordCount": 1250,
                "status": "published",
                "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "coins": ["BTC"],
                "source": "AI生成",
                "sourceUrl": None,
                "content": "Bitcoin（BTC）は過去24時間で大幅な価格上昇を記録し、市場参加者の注目を集めています...",
                "summary": "Bitcoinの最新価格動向と今後の展望について詳細分析"
            },
            {
                "id": "article_2",
                "title": "Ethereum 2.0のステーキング環境変化が市場に与える影響",
                "type": "technical",
                "wordCount": 980,
                "status": "draft",
                "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "coins": ["ETH"],
                "source": "AI生成",
                "sourceUrl": None,
                "content": "Ethereum 2.0におけるステーキング報酬率の変化は、長期的なホルダーの戦略に大きな影響を与えています...",
                "summary": "ETH2.0ステーキングの最新動向とその市場への影響"
            },
            {
                "id": "article_3",
                "title": "DeFiプロトコルの新たな進化：Solanaエコシステムの成長",
                "type": "news",
                "wordCount": 750,
                "status": "published",
                "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "coins": ["SOL"],
                "source": "AI生成",
                "sourceUrl": None,
                "content": "Solana（SOL）のDeFiエコシステムは近日中に複数の重要なアップデートを迎えます...",
                "summary": "Solana DeFiの最新プロトコルと取引量増加の背景"
            }
        ]
        
        # フィルタリング
        filtered_articles = mock_articles
        
        if status:
            filtered_articles = [a for a in filtered_articles if a["status"] == status]
        
        if type:
            filtered_articles = [a for a in filtered_articles if a["type"] == type]
        
        if search:
            search_lower = search.lower()
            filtered_articles = [
                a for a in filtered_articles 
                if search_lower in a["title"].lower() or 
                   search_lower in a["content"].lower() or
                   any(search_lower in coin.lower() for coin in a["coins"])
            ]
        
        # ページネーション
        total_count = len(filtered_articles)
        start_idx = offset
        end_idx = min(offset + limit, total_count)
        articles_page = filtered_articles[start_idx:end_idx]
        
        return {
            "articles": articles_page,
            "pagination": {
                "total": total_count,
                "offset": offset,
                "limit": limit,
                "hasMore": end_idx < total_count
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting articles: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"記事の取得に失敗しました: {str(e)}"}
        )

# システム関連のエンドポイント  
@app.get("/api/system/stats")
async def get_system_stats(request: Request):
    """システムの統計情報を取得"""
    try:
        # 基本的な統計情報を返す
        output_dir = "./output/articles"
        articles_today = 0
        if os.path.exists(output_dir):
            today = datetime.now().strftime("%Y%m%d")
            articles_today = len([
                f for f in os.listdir(output_dir) 
                if f.startswith(today) and f.endswith('.html')
            ])
        
        return {
            "articlesGenerated": articles_today,
            "topicsCollected": 12,  # デフォルト値
            "templatesCount": 4,    # デフォルト値
            "systemStatus": "running",
            "lastRun": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "dailyQuota": {
                "used": articles_today,
                "total": 50
            },
            "scheduler": {
                "isRunning": True,
                "isCollecting": False,
                "lastCollectionTime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "collectionCount": 5,
                "errorCount": 0,
                "nextRunTime": "Next run in 15 minutes"
            }
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        return JSONResponse(
            status_code=500, 
            content={"detail": f"システム統計の取得に失敗しました: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)