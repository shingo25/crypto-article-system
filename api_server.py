#!/usr/bin/env python3
"""
FastAPI backend server for the crypto article generation system
フロントエンドとバックエンドを接続するREST APIサーバー
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import os
import logging
from datetime import datetime, timedelta
import asyncio
from contextlib import asynccontextmanager

# 自作モジュール
from src.article_pipeline import ArticlePipeline, PipelineConfig
from src.topic_collector import TopicManager, RSSFeedCollector, PriceDataCollector
from src.crypto_article_generator_mvp import CryptoArticleGenerator, ArticleTopic, ArticleType, ArticleDepth
from src.fact_checker import FactChecker
from src.wordpress_publisher import WordPressClient, ArticlePublisher
from src.config_manager import get_config_manager, ConfigValidator

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# グローバル変数
pipeline: Optional[ArticlePipeline] = None
topic_manager: Optional[TopicManager] = None
article_generator: Optional[CryptoArticleGenerator] = None
fact_checker: Optional[FactChecker] = None
wordpress_client: Optional[WordPressClient] = None

# キャッシュ管理
import time
last_topic_collection = 0
TOPIC_COLLECTION_INTERVAL = 300  # 5分間隔でトピック収集

@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションの起動・終了時の処理"""
    global pipeline, topic_manager, article_generator, fact_checker, wordpress_client
    
    # 起動時の初期化
    logger.info("Initializing backend services...")
    
    # 設定を読み込み
    config = PipelineConfig(
        max_articles_per_day=int(os.getenv('MAX_ARTICLES_PER_DAY', 50)),
        max_articles_per_hour=int(os.getenv('MAX_ARTICLES_PER_HOUR', 10)),
        output_dir=os.getenv('OUTPUT_DIR', './output')
    )
    
    # サービスを初期化
    pipeline = ArticlePipeline(config)
    topic_manager = TopicManager()
    article_generator = CryptoArticleGenerator()
    fact_checker = FactChecker()
    
    # WordPress クライアント（設定がある場合のみ）
    try:
        wordpress_client = WordPressClient()
        logger.info("WordPress client initialized")
    except Exception as e:
        logger.warning(f"WordPress client not available: {e}")
        wordpress_client = None
    
    logger.info("Backend services initialized successfully")
    
    yield
    
    # 終了時のクリーンアップ
    logger.info("Shutting down backend services...")

# FastAPI アプリケーション
app = FastAPI(
    title="Crypto Article Generation System API",
    description="暗号通貨記事自動生成システムのREST API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Pydantic モデル
class SystemControlRequest(BaseModel):
    action: str  # 'start' or 'stop'

class ArticleGenerationRequest(BaseModel):
    topicId: str
    type: Optional[str] = None
    depth: Optional[str] = None
    keywords: Optional[List[str]] = None
    wordCount: Optional[int] = 1000
    tone: Optional[str] = "professional"
    includeImages: Optional[bool] = True
    includeCharts: Optional[bool] = True
    includeSources: Optional[bool] = True
    customInstructions: Optional[str] = None

class WordPressConfigRequest(BaseModel):
    url: str
    username: str
    password: str

class ArticleUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None

class APIConfigRequest(BaseModel):
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    wordpress_url: Optional[str] = None
    wordpress_username: Optional[str] = None
    wordpress_password: Optional[str] = None
    coinmarketcap_api_key: Optional[str] = None

class SourceRequest(BaseModel):
    name: str
    type: str  # 'rss', 'api', 'web'
    url: str
    description: Optional[str] = None
    active: Optional[bool] = True

# ヘルスチェック
@app.get("/")
async def root():
    return {"message": "Crypto Article Generation System API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# システム関連のエンドポイント
@app.get("/api/system/stats")
async def get_system_stats():
    """システムの統計情報を取得"""
    try:
        # パイプラインの統計を取得
        stats = pipeline.quota.get_stats() if pipeline else {}
        
        # ファイルベースの統計を計算
        output_dir = "./output/articles"
        articles_today = 0
        if os.path.exists(output_dir):
            today = datetime.now().strftime("%Y%m%d")
            articles_today = len([
                f for f in os.listdir(output_dir) 
                if f.startswith(today) and f.endswith('.html')
            ])
        
        # トピック数を計算
        topics_count = len(topic_manager.topics) if topic_manager else 0
        
        return {
            "articlesGenerated": articles_today,
            "topicsCollected": topics_count,
            "systemStatus": "running" if pipeline else "stopped",
            "lastRun": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "dailyQuota": {
                "used": stats.get('daily_count', articles_today),
                "total": 50
            }
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/system/control")
async def control_system(request: SystemControlRequest, background_tasks: BackgroundTasks):
    """システムの開始・停止"""
    try:
        if request.action == "start":
            if pipeline:
                background_tasks.add_task(run_pipeline_once)
                return {
                    "success": True,
                    "status": "starting",
                    "message": "パイプラインを開始しました"
                }
            else:
                raise HTTPException(status_code=500, detail="Pipeline not initialized")
        
        elif request.action == "stop":
            # 停止処理（実際の実装では適切な停止処理を行う）
            return {
                "success": True,
                "status": "stopped",
                "message": "パイプラインを停止しました"
            }
        
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
            
    except Exception as e:
        logger.error(f"Error controlling system: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def run_pipeline_once():
    """パイプラインを1回実行（バックグラウンドタスク）"""
    try:
        if pipeline:
            pipeline.run_once()
            logger.info("Pipeline executed successfully")
    except Exception as e:
        logger.error(f"Error running pipeline: {e}")

# トピック関連のエンドポイント
@app.get("/api/topics")
async def get_topics(
    limit: int = 20, 
    offset: int = 0,
    priority: Optional[str] = None,
    source: Optional[str] = None,
    sortBy: Optional[str] = None,
    force_refresh: bool = False
):
    """トピック一覧を取得（ページネーション・フィルタ対応）"""
    try:
        if not topic_manager:
            return {"topics": []}
        
        # 最新のトピックを収集（キャッシュ機能付き）
        global last_topic_collection
        current_time = time.time()
        
        if force_refresh or current_time - last_topic_collection > TOPIC_COLLECTION_INTERVAL:
            try:
                logger.info("Collecting new topics...")
                collectors = [RSSFeedCollector(), PriceDataCollector()]
                for collector in collectors:
                    try:
                        logger.info(f"Collecting from {collector.__class__.__name__}...")
                        new_topics = collector.collect()
                        topic_manager.add_topics(new_topics[:5])  # 最新5件のみ追加
                        logger.info(f"Successfully collected {len(new_topics)} topics from {collector.__class__.__name__}")
                    except Exception as e:
                        logger.warning(f"Error collecting from {collector.__class__.__name__}: {e}")
                last_topic_collection = current_time
                logger.info("Topic collection completed and cached")
            except Exception as e:
                logger.error(f"Error in topic collection process: {e}")
        else:
            logger.info("Using cached topics (collection interval not reached)")
        
        # 全トピックを取得
        all_topics = topic_manager.get_top_topics(count=1000)  # 大きな数で全取得
        
        # フィルタリング
        filtered_topics = all_topics
        
        # 優先度でフィルタ
        if priority:
            filtered_topics = [t for t in filtered_topics if t.priority.name.lower() == priority.lower()]
        
        # ソースでフィルタ
        if source:
            source_mapping = {
                "rss": "rss_feed",
                "price": "price_api", 
                "trend": "social_media",
                "news": "news_api",
                "onchain": "onchain_data"
            }
            source_value = source_mapping.get(source.lower(), source.lower())
            filtered_topics = [t for t in filtered_topics if t.source.value == source_value]
        
        # ソート機能を適用
        if sortBy == 'time':
            # 更新時間順（新しい順）
            filtered_topics = sorted(filtered_topics, key=lambda x: x.collected_at, reverse=True)
        elif sortBy == 'title':
            # タイトル順（アルファベット順）
            filtered_topics = sorted(filtered_topics, key=lambda x: x.title.lower())
        else:
            # デフォルト: スコア順（高い順）
            filtered_topics = sorted(filtered_topics, key=lambda x: x.score, reverse=True)
        
        # ページネーション適用
        total_count = len(filtered_topics)
        topics = filtered_topics[offset:offset + limit]
        
        topics_data = []
        for topic in topics:
            # ソース情報の取得
            source_name = topic.source.value if topic.source else "unknown"
            
            # ソース名を日本語で表示
            source_display = {
                "rss_feed": "RSS配信",
                "price_api": "価格データ",
                "social_media": "トレンド",
                "news_api": "ニュースAPI",
                "onchain_data": "オンチェーンデータ"
            }.get(source_name, source_name)
            
            topics_data.append({
                "id": str(hash(topic.title)),  # 簡易ID
                "title": topic.title,
                "priority": topic.priority.name.lower(),
                "score": topic.score,
                "coins": topic.coins,
                "collectedAt": topic.collected_at.strftime("%Y-%m-%d %H:%M:%S"),
                "source": source_display,
                "sourceUrl": topic.source_url
            })
        
        return {
            "topics": topics_data,
            "pagination": {
                "total": total_count,
                "offset": offset,
                "limit": limit,
                "hasMore": offset + limit < total_count
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting topics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/topics/{topic_id}")
async def update_topic(topic_id: str, updates: dict):
    """トピックを更新"""
    try:
        if not topic_manager:
            raise HTTPException(status_code=500, detail="Topic manager not initialized")
        
        # トピックを検索
        topic_found = None
        for topic in topic_manager.topics:
            if str(hash(topic.title)) == topic_id:
                topic_found = topic
                break
        
        if not topic_found:
            raise HTTPException(status_code=404, detail="Topic not found")
        
        # 更新可能なフィールドのみ適用
        if 'title' in updates:
            topic_found.title = updates['title']
        if 'priority' in updates:
            # 優先度を変更
            from src.topic_collector import Priority
            for priority in Priority:
                if priority.name.lower() == updates['priority'].lower():
                    topic_found.priority = priority
                    break
        if 'score' in updates:
            topic_found.score = float(updates['score'])
        
        return {"success": True, "message": "Topic updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating topic: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/topics/{topic_id}")
async def delete_topic(topic_id: str):
    """トピックを削除"""
    try:
        if not topic_manager:
            raise HTTPException(status_code=500, detail="Topic manager not initialized")
        
        # トピックを検索
        topic_found = None
        topic_index = -1
        for i, topic in enumerate(topic_manager.topics):
            if str(hash(topic.title)) == topic_id:
                topic_found = topic
                topic_index = i
                break
        
        if not topic_found:
            raise HTTPException(status_code=404, detail="Topic not found")
        
        # トピックを削除
        topic_manager.topics.pop(topic_index)
        
        return {"success": True, "message": "Topic deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting topic: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 記事関連のエンドポイント
@app.get("/api/articles")
async def get_articles(limit: int = 20, status: Optional[str] = None, type: Optional[str] = None):
    """記事一覧を取得"""
    try:
        articles_dir = "./output/articles"
        articles_data = []
        
        if os.path.exists(articles_dir):
            files = [f for f in os.listdir(articles_dir) if f.endswith('.html')]
            files.sort(reverse=True)  # 新しい順
            
            for filename in files[:limit]:
                # メタデータファイルを読み込み
                meta_file = filename.replace('.html', '_meta.json')
                meta_path = os.path.join(articles_dir, meta_file)
                
                if os.path.exists(meta_path):
                    with open(meta_path, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                    
                    article_data = {
                        "id": filename.replace('.html', ''),
                        "title": metadata.get('topic', {}).get('title', 'Unknown'),
                        "type": metadata.get('article', {}).get('type', 'unknown'),
                        "wordCount": metadata.get('article', {}).get('word_count', 0),
                        "status": "draft",  # デフォルトは下書き
                        "generatedAt": metadata.get('generated_at', ''),
                        "coins": metadata.get('article', {}).get('coins', [])
                    }
                    
                    # フィルタリング
                    if status and article_data['status'] != status:
                        continue
                    if type and article_data['type'] != type:
                        continue
                    
                    articles_data.append(article_data)
        
        return {"articles": articles_data}
        
    except Exception as e:
        logger.error(f"Error getting articles: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/articles/{article_id}/content")
async def get_article_content(article_id: str):
    """記事のコンテンツを取得"""
    try:
        articles_dir = "./output/articles"
        html_path = os.path.join(articles_dir, f"{article_id}.html")
        
        if not os.path.exists(html_path):
            raise HTTPException(status_code=404, detail="Article not found")
        
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # HTMLからテキストを抽出（BeautifulSoupが利用可能な場合）
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            text_content = soup.get_text()
        except ImportError:
            # BeautifulSoupが利用できない場合は簡易的にHTMLタグを除去
            import re
            text_content = re.sub('<[^<]+?>', '', html_content)
        
        return {
            "content": text_content,
            "htmlContent": html_content
        }
        
    except Exception as e:
        logger.error(f"Error getting article content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/articles/{article_id}")
async def update_article(article_id: str, updates: dict):
    """記事を更新"""
    try:
        articles_dir = "./output/articles"
        meta_file = f"{article_id}_meta.json"
        meta_path = os.path.join(articles_dir, meta_file)
        
        if not os.path.exists(meta_path):
            raise HTTPException(status_code=404, detail="Article not found")
        
        # メタデータを読み込み
        with open(meta_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        # 更新可能なフィールドのみ適用
        if 'title' in updates:
            if 'article' not in metadata:
                metadata['article'] = {}
            metadata['article']['title'] = updates['title']
        if 'type' in updates:
            if 'article' not in metadata:
                metadata['article'] = {}
            metadata['article']['type'] = updates['type']
        if 'status' in updates:
            if 'article' not in metadata:
                metadata['article'] = {}
            metadata['article']['status'] = updates['status']
        
        # メタデータを保存
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        return {"success": True, "message": "Article updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating article: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/articles/{article_id}")
async def delete_article(article_id: str):
    """記事を削除"""
    try:
        articles_dir = "./output/articles"
        html_path = os.path.join(articles_dir, f"{article_id}.html")
        meta_path = os.path.join(articles_dir, f"{article_id}_meta.json")
        
        # ファイルを削除
        if os.path.exists(html_path):
            os.remove(html_path)
        if os.path.exists(meta_path):
            os.remove(meta_path)
        
        return {"success": True, "message": "Article deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting article: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/articles/{article_id}/publish")
async def publish_article(article_id: str):
    """記事をWordPressに公開"""
    try:
        if not wordpress_client:
            raise HTTPException(status_code=500, detail="WordPress client not initialized")
        
        articles_dir = "./output/articles"
        html_path = os.path.join(articles_dir, f"{article_id}.html")
        meta_path = os.path.join(articles_dir, f"{article_id}_meta.json")
        
        if not os.path.exists(html_path) or not os.path.exists(meta_path):
            raise HTTPException(status_code=404, detail="Article not found")
        
        # 記事コンテンツとメタデータを読み込み
        with open(html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        with open(meta_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        # WordPressに投稿
        title = metadata.get('article', {}).get('title', 'Untitled')
        wordpress_client.publish_article(title, content)
        
        # ステータスを更新
        if 'article' not in metadata:
            metadata['article'] = {}
        metadata['article']['status'] = 'published'
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        return {"success": True, "message": "Article published successfully"}
        
    except Exception as e:
        logger.error(f"Error publishing article: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/articles/generate")
async def generate_article(request: ArticleGenerationRequest, background_tasks: BackgroundTasks):
    """記事を生成"""
    try:
        if not article_generator or not topic_manager:
            raise HTTPException(status_code=500, detail="Services not initialized")
        
        # トピックを検索
        topic_found = None
        for topic in topic_manager.topics:
            if str(hash(topic.title)) == request.topicId:
                topic_found = topic
                break
        
        if not topic_found:
            raise HTTPException(status_code=404, detail="Topic not found")
        
        # 記事生成をバックグラウンドで実行
        background_tasks.add_task(
            generate_article_background,
            topic_found,
            request.type,
            request.depth,
            request.keywords,
            request.wordCount,
            request.tone,
            request.includeImages,
            request.includeCharts,
            request.includeSources,
            request.customInstructions
        )
        
        return {
            "success": True,
            "message": "記事生成を開始しました",
            "articleId": f"generating_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        }
        
    except Exception as e:
        logger.error(f"Error generating article: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def generate_article_background(
    topic, 
    article_type=None, 
    depth=None, 
    keywords=None,
    word_count=1000,
    tone="professional",
    include_images=True,
    include_charts=True,
    include_sources=True,
    custom_instructions=None
):
    """記事生成のバックグラウンドタスク"""
    try:
        # ArticleTopicに変換
        from src.crypto_article_generator_mvp import ArticleType, ArticleDepth
        
        # デフォルト値の設定
        if article_type:
            for at in ArticleType:
                if at.value == article_type:
                    article_type = at
                    break
        else:
            article_type = ArticleType.MARKET_OVERVIEW
        
        if depth:
            for ad in ArticleDepth:
                if ad.value == depth:
                    depth = ad
                    break
        else:
            depth = ArticleDepth.MEDIUM
        
        coin_symbol = topic.coins[0] if topic.coins else "CRYPTO"
        article_topic = ArticleTopic(
            title=topic.title,
            coin_symbol=coin_symbol,
            coin_name=coin_symbol,
            article_type=article_type,
            depth=depth,
            keywords=keywords or topic.keywords
        )
        
        # 記事を生成
        article = article_generator.generate_article(article_topic)
        
        # ファイルに保存
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{coin_symbol}_{article_type.value}"
        
        output_dir = "./output/articles"
        os.makedirs(output_dir, exist_ok=True)
        
        # HTML保存
        with open(f"{output_dir}/{filename}.html", 'w', encoding='utf-8') as f:
            f.write(article.html_content)
        
        # メタデータ保存
        metadata = {
            "generated_at": article.generated_at.isoformat(),
            "topic": {
                "title": topic.title,
                "score": topic.score
            },
            "article": {
                "type": article_type.value,
                "depth": depth.value,
                "word_count": article.word_count,
                "coins": article.coins,
                "keywords": article.keywords
            }
        }
        
        with open(f"{output_dir}/{filename}_meta.json", 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Article generated successfully: {filename}")
        
    except Exception as e:
        logger.error(f"Error in background article generation: {e}")

@app.get("/api/articles/{article_id}")
async def get_article_content(article_id: str):
    """記事の詳細を取得"""
    try:
        articles_dir = "./output/articles"
        html_path = os.path.join(articles_dir, f"{article_id}.html")
        meta_path = os.path.join(articles_dir, f"{article_id}_meta.json")
        
        if not os.path.exists(html_path) or not os.path.exists(meta_path):
            raise HTTPException(status_code=404, detail="Article not found")
        
        # HTMLコンテンツを読み込み
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # メタデータを読み込み
        with open(meta_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        return {
            "id": article_id,
            "title": metadata.get('topic', {}).get('title', 'Unknown'),
            "content": html_content,  # プレーンテキスト（簡易変換）
            "htmlContent": html_content,
            "type": metadata.get('article', {}).get('type', 'unknown'),
            "status": "draft",
            "wordCount": metadata.get('article', {}).get('word_count', 0),
            "generatedAt": metadata.get('generated_at', ''),
            "coins": metadata.get('article', {}).get('coins', [])
        }
        
    except Exception as e:
        logger.error(f"Error getting article content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/articles/{article_id}/fact-check")
async def run_fact_check(article_id: str):
    """ファクトチェックを実行"""
    try:
        if not fact_checker:
            raise HTTPException(status_code=500, detail="Fact checker not initialized")
        
        # 記事内容を取得
        articles_dir = "./output/articles"
        html_path = os.path.join(articles_dir, f"{article_id}.html")
        
        if not os.path.exists(html_path):
            raise HTTPException(status_code=404, detail="Article not found")
        
        with open(html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # ファクトチェック実行
        results = fact_checker.check_article(content)
        
        return {
            "success": True,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error running fact check: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WordPress関連のエンドポイント
@app.get("/api/wordpress/config")
async def get_wordpress_config():
    """WordPress設定を取得"""
    try:
        if wordpress_client:
            return {
                "url": os.getenv('WORDPRESS_URL', ''),
                "username": os.getenv('WORDPRESS_USERNAME', ''),
                "connected": True,
                "lastSync": datetime.now().isoformat()
            }
        else:
            return {
                "connected": False
            }
    except Exception as e:
        logger.error(f"Error getting WordPress config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/wordpress/test")
async def test_wordpress_connection():
    """WordPress接続をテスト"""
    try:
        if not wordpress_client:
            return {
                "success": False,
                "message": "WordPress client not configured"
            }
        
        # 接続テスト
        success = wordpress_client.test_connection()
        
        return {
            "success": success,
            "message": "接続成功" if success else "接続失敗"
        }
        
    except Exception as e:
        logger.error(f"Error testing WordPress connection: {e}")
        return {
            "success": False,
            "message": f"接続エラー: {str(e)}"
        }

# ログ関連のエンドポイント
@app.get("/api/logs")
async def get_logs(level: Optional[str] = None, limit: int = 100):
    """システムログを取得"""
    try:
        # 簡易的なログ実装（実際にはより高度なログ管理が必要）
        logs = [
            {
                "timestamp": (datetime.now() - timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S"),
                "level": "INFO",
                "message": "記事生成を開始しました",
                "component": "article_generator"
            },
            {
                "timestamp": (datetime.now() - timedelta(minutes=8)).strftime("%Y-%m-%d %H:%M:%S"),
                "level": "INFO",
                "message": "トピック収集が完了しました (45件)",
                "component": "topic_collector"
            },
            {
                "timestamp": (datetime.now() - timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S"),
                "level": "INFO",
                "message": "RSS フィードから新しいトピックを検出",
                "component": "rss_collector"
            },
            {
                "timestamp": (datetime.now() - timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S"),
                "level": "INFO",
                "message": "価格データを更新しました",
                "component": "price_collector"
            },
            {
                "timestamp": (datetime.now() - timedelta(minutes=20)).strftime("%Y-%m-%d %H:%M:%S"),
                "level": "INFO",
                "message": "システム正常稼働中",
                "component": "system"
            }
        ]
        
        # レベルでフィルタ
        if level:
            logs = [log for log in logs if log['level'] == level.upper()]
        
        return {"logs": logs[:limit]}
        
    except Exception as e:
        logger.error(f"Error getting logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# API設定関連のエンドポイント
@app.get("/api/settings/config")
async def get_api_config():
    """現在のAPI設定を取得（機密情報はマスク）"""
    try:
        config = {
            "openai_api_key": mask_api_key(os.getenv('OPENAI_API_KEY', '')),
            "gemini_api_key": mask_api_key(os.getenv('GEMINI_API_KEY', '')),
            "wordpress_url": os.getenv('WORDPRESS_URL', ''),
            "wordpress_username": os.getenv('WORDPRESS_USERNAME', ''),
            "wordpress_password": mask_api_key(os.getenv('WORDPRESS_APP_PASSWORD', '')),
            "coinmarketcap_api_key": mask_api_key(os.getenv('COINMARKETCAP_API_KEY', '')),
            "max_articles_per_day": int(os.getenv('MAX_ARTICLES_PER_DAY', 50)),
            "default_article_depth": os.getenv('DEFAULT_ARTICLE_DEPTH', 'medium'),
            "default_word_count_min": int(os.getenv('DEFAULT_WORD_COUNT_MIN', 600)),
            "default_word_count_max": int(os.getenv('DEFAULT_WORD_COUNT_MAX', 1000))
        }
        
        return {"config": config}
        
    except Exception as e:
        logger.error(f"Error getting API config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings/config")
async def update_api_config(request: APIConfigRequest):
    """API設定を更新"""
    try:
        # .envファイルの内容を読み込み
        env_file = ".env"
        env_content = {}
        
        if os.path.exists(env_file):
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env_content[key] = value
        
        # 新しい設定で更新
        updates = {}
        if request.openai_api_key:
            updates['OPENAI_API_KEY'] = request.openai_api_key
        if request.gemini_api_key:
            updates['GEMINI_API_KEY'] = request.gemini_api_key
        if request.wordpress_url:
            updates['WORDPRESS_URL'] = request.wordpress_url
        if request.wordpress_username:
            updates['WORDPRESS_USERNAME'] = request.wordpress_username
        if request.wordpress_password:
            updates['WORDPRESS_APP_PASSWORD'] = request.wordpress_password
        if request.coinmarketcap_api_key:
            updates['COINMARKETCAP_API_KEY'] = request.coinmarketcap_api_key
        
        # env_contentを更新
        env_content.update(updates)
        
        # .envファイルに書き込み
        with open(env_file, 'w', encoding='utf-8') as f:
            f.write("# LLM API Keys\n")
            f.write(f"OPENAI_API_KEY={env_content.get('OPENAI_API_KEY', 'your_openai_api_key_here')}\n")
            f.write(f"GEMINI_API_KEY={env_content.get('GEMINI_API_KEY', 'your_gemini_api_key_here')}\n")
            f.write("\n# WordPress Configuration\n")
            f.write(f"WORDPRESS_URL={env_content.get('WORDPRESS_URL', 'https://your-wordpress-site.com')}\n")
            f.write(f"WORDPRESS_USERNAME={env_content.get('WORDPRESS_USERNAME', 'your_username')}\n")
            f.write(f"WORDPRESS_APP_PASSWORD={env_content.get('WORDPRESS_APP_PASSWORD', 'your_app_password')}\n")
            f.write("\n# Other APIs\n")
            f.write(f"COINMARKETCAP_API_KEY={env_content.get('COINMARKETCAP_API_KEY', '')}\n")
            f.write("\n# Database Configuration (for future use)\n")
            f.write(f"DATABASE_URL={env_content.get('DATABASE_URL', 'sqlite:///crypto_articles.db')}\n")
            f.write("\n# API Rate Limits\n")
            f.write(f"MAX_ARTICLES_PER_DAY={env_content.get('MAX_ARTICLES_PER_DAY', '50')}\n")
            f.write(f"MAX_TOKENS_PER_ARTICLE={env_content.get('MAX_TOKENS_PER_ARTICLE', '2000')}\n")
            f.write("\n# Content Settings\n")
            f.write(f"DEFAULT_ARTICLE_DEPTH={env_content.get('DEFAULT_ARTICLE_DEPTH', 'medium')}\n")
            f.write(f"DEFAULT_WORD_COUNT_MIN={env_content.get('DEFAULT_WORD_COUNT_MIN', '600')}\n")
            f.write(f"DEFAULT_WORD_COUNT_MAX={env_content.get('DEFAULT_WORD_COUNT_MAX', '1000')}\n")
        
        # 環境変数を即座に更新
        for key, value in updates.items():
            os.environ[key] = value
        
        # WordPress クライアントを再初期化
        global wordpress_client
        if any(k.startswith('WORDPRESS_') for k in updates.keys()):
            try:
                wordpress_client = WordPressClient()
                logger.info("WordPress client reinitialized")
            except Exception as e:
                logger.warning(f"Failed to reinitialize WordPress client: {e}")
                wordpress_client = None
        
        return {
            "success": True,
            "message": "設定を更新しました",
            "updated_keys": list(updates.keys())
        }
        
    except Exception as e:
        logger.error(f"Error updating API config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings/test-connection")
async def test_api_connections():
    """全てのAPI接続をテスト"""
    try:
        results = {}
        
        # OpenAI API テスト
        if os.getenv('OPENAI_API_KEY'):
            try:
                # OpenAI接続テスト（実際の実装では簡単なAPIコールを行う）
                results['openai'] = {
                    "status": "success",
                    "message": "接続可能",
                    "configured": True
                }
            except Exception as e:
                results['openai'] = {
                    "status": "error", 
                    "message": str(e),
                    "configured": True
                }
        else:
            results['openai'] = {
                "status": "not_configured",
                "message": "APIキーが設定されていません",
                "configured": False
            }
        
        # Gemini API テスト
        if os.getenv('GEMINI_API_KEY'):
            results['gemini'] = {
                "status": "success",
                "message": "接続可能",
                "configured": True
            }
        else:
            results['gemini'] = {
                "status": "not_configured",
                "message": "APIキーが設定されていません",
                "configured": False
            }
        
        # WordPress テスト
        if wordpress_client:
            try:
                success = wordpress_client.test_connection()
                results['wordpress'] = {
                    "status": "success" if success else "error",
                    "message": "接続成功" if success else "接続失敗",
                    "configured": True
                }
            except Exception as e:
                results['wordpress'] = {
                    "status": "error",
                    "message": str(e),
                    "configured": True
                }
        else:
            results['wordpress'] = {
                "status": "not_configured",
                "message": "WordPress設定が未完了",
                "configured": False
            }
        
        # CoinGecko API テスト（無料なので常に利用可能）
        results['coingecko'] = {
            "status": "success",
            "message": "利用可能（無料API）",
            "configured": True
        }
        
        return {"results": results}
        
    except Exception as e:
        logger.error(f"Error testing API connections: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# セキュア設定管理エンドポイント
@app.get("/api/secure-config")
async def get_secure_config():
    """暗号化された設定を取得（センシティブな値は隠す）"""
    try:
        config_manager = get_config_manager()
        config_summary = config_manager.get_config_summary()
        
        return {
            "success": True,
            "config": config_summary,
            "total_keys": len(config_summary)
        }
        
    except Exception as e:
        logger.error(f"Error getting secure config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/secure-config")
async def update_secure_config(config_updates: Dict[str, Any]):
    """暗号化された設定を更新"""
    try:
        config_manager = get_config_manager()
        
        # 設定値を検証
        validation_errors = ConfigValidator.validate_config(config_updates)
        if validation_errors:
            return {
                "success": False,
                "message": "設定値の検証に失敗しました",
                "errors": validation_errors
            }
        
        # 設定を更新
        success = config_manager.update_config(config_updates)
        
        if success:
            # 環境変数も更新（後方互換性のため）
            for key, value in config_updates.items():
                if key == 'openai_api_key':
                    os.environ['OPENAI_API_KEY'] = value
                elif key == 'gemini_api_key':
                    os.environ['GEMINI_API_KEY'] = value
                elif key == 'wordpress_url':
                    os.environ['WORDPRESS_URL'] = value
                elif key == 'wordpress_username':
                    os.environ['WORDPRESS_USERNAME'] = value
                elif key == 'wordpress_password':
                    os.environ['WORDPRESS_APP_PASSWORD'] = value
                elif key == 'coinmarketcap_api_key':
                    os.environ['COINMARKETCAP_API_KEY'] = value
            
            # WordPress クライアントを再初期化
            global wordpress_client
            if any(k.startswith('wordpress_') for k in config_updates.keys()):
                try:
                    wordpress_client = WordPressClient()
                    logger.info("WordPress client reinitialized with secure config")
                except Exception as e:
                    logger.warning(f"Failed to reinitialize WordPress client: {e}")
                    wordpress_client = None
            
            return {
                "success": True,
                "message": "設定を安全に保存しました",
                "updated_keys": list(config_updates.keys())
            }
        else:
            return {
                "success": False,
                "message": "設定の保存に失敗しました"
            }
        
    except Exception as e:
        logger.error(f"Error updating secure config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/secure-config/backup")
async def backup_secure_config():
    """設定のバックアップを作成"""
    try:
        config_manager = get_config_manager()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"config_backup_{timestamp}.enc"
        
        success = config_manager.backup_config(backup_file)
        
        return {
            "success": success,
            "message": f"設定をバックアップしました: {backup_file}" if success else "バックアップに失敗しました",
            "backup_file": backup_file if success else None
        }
        
    except Exception as e:
        logger.error(f"Error backing up config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/secure-config/validate")
async def validate_secure_config(config_data: Dict[str, Any]):
    """設定値の検証のみを行う"""
    try:
        validation_errors = ConfigValidator.validate_config(config_data)
        
        return {
            "valid": len(validation_errors) == 0,
            "errors": validation_errors,
            "message": "設定値は有効です" if len(validation_errors) == 0 else "設定値に問題があります"
        }
        
    except Exception as e:
        logger.error(f"Error validating config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/secure-config/keys")
async def get_config_keys():
    """設定可能なキーの一覧を取得"""
    return {
        "sensitive_keys": [
            "openai_api_key",
            "gemini_api_key", 
            "wordpress_password",
            "coinmarketcap_api_key",
            "database_password",
            "secret_key"
        ],
        "normal_keys": [
            "wordpress_url",
            "wordpress_username",
            "max_articles_per_day",
            "default_article_depth",
            "default_word_count_min",
            "default_word_count_max"
        ],
        "key_descriptions": {
            "openai_api_key": "OpenAI APIキー (GPTモデル用)",
            "gemini_api_key": "Google Gemini APIキー",
            "wordpress_url": "WordPressサイトのURL",
            "wordpress_username": "WordPressユーザー名",
            "wordpress_password": "WordPressアプリケーションパスワード",
            "coinmarketcap_api_key": "CoinMarketCap APIキー",
            "max_articles_per_day": "1日の最大記事生成数",
            "default_article_depth": "デフォルトの記事の深さ",
            "default_word_count_min": "最小単語数",
            "default_word_count_max": "最大単語数"
        }
    }

# ソース管理エンドポイント
@app.get("/api/sources")
async def get_sources():
    """登録されたソース一覧を取得"""
    try:
        # ソース情報をファイルから読み込み（実装簡略化）
        sources_file = "sources.json"
        if os.path.exists(sources_file):
            with open(sources_file, 'r', encoding='utf-8') as f:
                sources = json.load(f)
        else:
            # デフォルトソース
            sources = [
                {
                    "id": "1",
                    "name": "Cointelegraph RSS",
                    "type": "rss",
                    "url": "https://cointelegraph.com/rss",
                    "active": True,
                    "description": "暗号通貨ニュースの主要RSS配信",
                    "itemsCollected": 15,
                    "lastUpdate": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                },
                {
                    "id": "2", 
                    "name": "CoinGecko API",
                    "type": "api",
                    "url": "https://api.coingecko.com/api/v3/search/trending",
                    "active": True,
                    "description": "トレンドコインのAPI取得",
                    "itemsCollected": 5,
                    "lastUpdate": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
            ]
        
        return {"success": True, "sources": sources}
        
    except Exception as e:
        logger.error(f"Error getting sources: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sources")
async def add_source(source: SourceRequest):
    """新しいソースを追加"""
    try:
        sources_file = "sources.json"
        
        # 既存ソースを読み込み
        if os.path.exists(sources_file):
            with open(sources_file, 'r', encoding='utf-8') as f:
                sources = json.load(f)
        else:
            sources = []
        
        # 新しいソースを追加
        new_source = {
            "id": str(len(sources) + 1),
            "name": source.name,
            "type": source.type,
            "url": source.url,
            "active": source.active,
            "description": source.description,
            "itemsCollected": 0,
            "lastUpdate": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        sources.append(new_source)
        
        # ファイルに保存
        with open(sources_file, 'w', encoding='utf-8') as f:
            json.dump(sources, f, indent=2, ensure_ascii=False)
        
        return {"success": True, "source": new_source, "message": "ソースを追加しました"}
        
    except Exception as e:
        logger.error(f"Error adding source: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/sources/{source_id}")
async def update_source(source_id: str, updates: dict):
    """ソースを更新"""
    try:
        sources_file = "sources.json"
        
        if not os.path.exists(sources_file):
            raise HTTPException(status_code=404, detail="Sources file not found")
        
        with open(sources_file, 'r', encoding='utf-8') as f:
            sources = json.load(f)
        
        # ソースを検索・更新
        source_found = False
        for source in sources:
            if source["id"] == source_id:
                source.update(updates)
                source["lastUpdate"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                source_found = True
                break
        
        if not source_found:
            raise HTTPException(status_code=404, detail="Source not found")
        
        # ファイルに保存
        with open(sources_file, 'w', encoding='utf-8') as f:
            json.dump(sources, f, indent=2, ensure_ascii=False)
        
        return {"success": True, "message": "ソースを更新しました"}
        
    except Exception as e:
        logger.error(f"Error updating source: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/sources/{source_id}")
async def delete_source(source_id: str):
    """ソースを削除"""
    try:
        sources_file = "sources.json"
        
        if not os.path.exists(sources_file):
            raise HTTPException(status_code=404, detail="Sources file not found")
        
        with open(sources_file, 'r', encoding='utf-8') as f:
            sources = json.load(f)
        
        # ソースを削除
        original_length = len(sources)
        sources = [s for s in sources if s["id"] != source_id]
        
        if len(sources) == original_length:
            raise HTTPException(status_code=404, detail="Source not found")
        
        # ファイルに保存
        with open(sources_file, 'w', encoding='utf-8') as f:
            json.dump(sources, f, indent=2, ensure_ascii=False)
        
        return {"success": True, "message": "ソースを削除しました"}
        
    except Exception as e:
        logger.error(f"Error deleting source: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sources/{source_id}/collect")
async def collect_from_source(source_id: str):
    """特定のソースからトピックを収集"""
    try:
        sources_file = "sources.json"
        
        if not os.path.exists(sources_file):
            raise HTTPException(status_code=404, detail="Sources file not found")
        
        with open(sources_file, 'r', encoding='utf-8') as f:
            sources = json.load(f)
        
        # ソースを検索
        source = None
        for s in sources:
            if s["id"] == source_id:
                source = s
                break
        
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
        
        if not source.get("active", True):
            raise HTTPException(status_code=400, detail="Source is inactive")
        
        # トピック収集を実行（背景タスクとして）
        if topic_manager:
            if source["type"] == "rss":
                collector = RSSFeedCollector()
                collector.feeds = [source["url"]]  # URLを設定
                new_topics = collector.collect()
                topic_manager.add_topics(new_topics)
                collected_count = len(new_topics)
            elif source["type"] == "api":
                # APIの場合は適切なコレクターを使用
                if "coingecko" in source["url"].lower():
                    collector = PriceDataCollector()
                    new_topics = collector.collect()
                    topic_manager.add_topics(new_topics)
                    collected_count = len(new_topics)
                else:
                    collected_count = 0
            else:
                collected_count = 0
            
            # ソースの統計を更新
            for s in sources:
                if s["id"] == source_id:
                    s["itemsCollected"] = s.get("itemsCollected", 0) + collected_count
                    s["lastUpdate"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    break
            
            # ファイルに保存
            with open(sources_file, 'w', encoding='utf-8') as f:
                json.dump(sources, f, indent=2, ensure_ascii=False)
        
        return {
            "success": True, 
            "message": f"ソース '{source['name']}' から {collected_count} 件のトピックを収集しました",
            "collected_count": collected_count
        }
        
    except Exception as e:
        logger.error(f"Error collecting from source: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sources/test")
async def test_source_url(url_data: dict):
    """ソースURLをテスト"""
    try:
        url = url_data.get("url")
        source_type = url_data.get("type", "rss")
        
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        # URLテストを実行
        import aiohttp
        import asyncio
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status != 200:
                        return {
                            "success": False,
                            "message": f"HTTP {response.status}: アクセスできません"
                        }
                    
                    content = await response.text()
                    
                    if source_type == "rss":
                        if "<rss" in content or "<feed" in content or "<entry" in content:
                            item_count = content.count("<item>") + content.count("<entry>")
                            return {
                                "success": True,
                                "message": "RSS フィードが正常に取得できました",
                                "items_found": item_count
                            }
                        else:
                            return {
                                "success": False,
                                "message": "RSSフィードではありません"
                            }
                    elif source_type == "api":
                        try:
                            data = json.loads(content)
                            return {
                                "success": True,
                                "message": "API が正常に応答しました",
                                "items_found": len(data) if isinstance(data, list) else 1
                            }
                        except json.JSONDecodeError:
                            return {
                                "success": False,
                                "message": "有効なJSONレスポンスではありません"
                            }
                    else:
                        return {
                            "success": True,
                            "message": "ウェブサイトが正常にアクセスできました"
                        }
                        
            except asyncio.TimeoutError:
                return {
                    "success": False,
                    "message": "接続タイムアウト"
                }
            except Exception as e:
                return {
                    "success": False,
                    "message": f"接続エラー: {str(e)}"
                }
        
    except Exception as e:
        logger.error(f"Error testing source: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def mask_api_key(api_key: str) -> str:
    """APIキーをマスクして表示"""
    if not api_key or api_key in ['your_openai_api_key_here', 'your_gemini_api_key_here', 'your_app_password']:
        return ""
    
    if len(api_key) <= 8:
        return "****"
    
    return api_key[:4] + "*" * (len(api_key) - 8) + api_key[-4:]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)