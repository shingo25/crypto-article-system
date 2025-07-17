#!/usr/bin/env python3
"""
最小限のFastAPI server - 認証機能を除外して基本機能のみ
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import logging
from datetime import datetime

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI アプリケーション
app = FastAPI(
    title="Crypto Article Generation System API",
    description="暗号通貨記事自動生成システムのREST API",
    version="1.0.0"
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
    """トピック一覧を取得（モックデータ）"""
    try:
        # モックデータを作成
        mock_topics = [
            {
                "id": "topic_1",
                "title": "Bitcoin価格が過去最高値を更新、機関投資家の需要増加が要因",
                "priority": "high",
                "score": 95,
                "coins": ["BTC"],
                "collectedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "source": "RSS配信",
                "sourceUrl": "https://example.com/news/btc",
                "summary": "Bitcoinが新たな価格水準に到達",
                "type": "analysis",
                "question": "なぜBitcoinは急騰したのか？今後の価格予想",
                "primaryData": {
                    "coin": "BTC",
                    "change24h": 8.5,
                    "currentPrice": 67420,
                    "volume24h": "$28,900,000,000"
                },
                "estimatedReadTime": 5
            },
            {
                "id": "topic_2", 
                "title": "Ethereum 2.0のステーキング報酬率が過去最低を記録",
                "priority": "medium",
                "score": 78,
                "coins": ["ETH"],
                "collectedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "source": "価格データ",
                "sourceUrl": "https://example.com/eth-staking",
                "summary": "ETH2.0ステーキング環境の変化",
                "type": "analysis",
                "question": "ステーキング報酬低下が市場に与える影響は？",
                "primaryData": {
                    "coin": "ETH",
                    "change24h": -2.3,
                    "currentPrice": 3845,
                    "volume24h": "$15,200,000,000"
                },
                "estimatedReadTime": 7
            },
            {
                "id": "topic_3",
                "title": "Solana DEXでの取引量が急増、新たなプロトコルの影響",
                "priority": "medium",
                "score": 82,
                "coins": ["SOL"],
                "collectedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "source": "トレンド",
                "summary": "Solana DeFiエコシステムの成長",
                "type": "standard",
                "primaryData": {
                    "coin": "SOL",
                    "change24h": 12.8,
                    "currentPrice": 178,
                    "volume24h": "$4,800,000,000"
                }
            },
            {
                "id": "topic_4",
                "title": "Cardano ADA、新たなスマートコントラクト機能を発表",
                "priority": "low",
                "score": 65,
                "coins": ["ADA"],
                "collectedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "source": "ニュースAPI",
                "summary": "ADAの技術的進展",
                "type": "standard"
            },
            {
                "id": "topic_5",
                "title": "中央銀行デジタル通貨（CBDC）に関する新たな規制案",
                "priority": "urgent",
                "score": 98,
                "coins": ["BTC", "ETH"],
                "collectedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "source": "RSS配信",
                "summary": "CBDC規制の市場への影響",
                "type": "analysis",
                "question": "CBDCの導入は暗号通貨市場にどんな影響を与える？",
                "estimatedReadTime": 8
            }
        ]
        
        # フィルタリング
        filtered_topics = mock_topics
        
        if priority:
            filtered_topics = [t for t in filtered_topics if t["priority"] == priority]
        
        if source:
            filtered_topics = [t for t in filtered_topics if source.lower() in t["source"].lower()]
        
        # ソート
        if sortBy == "created_at":
            filtered_topics = sorted(filtered_topics, key=lambda x: x["collectedAt"], reverse=True)
        elif sortBy == "score":
            filtered_topics = sorted(filtered_topics, key=lambda x: x["score"], reverse=True)
        
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