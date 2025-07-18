#!/usr/bin/env python3
"""
RSS feed client for fetching cryptocurrency news
"""

import feedparser
import logging
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from urllib.parse import urlparse
import requests

logger = logging.getLogger(__name__)

class RSSClient:
    """RSS feed client for cryptocurrency news"""
    
    def __init__(self, db_session=None):
        self.db_session = db_session
        
        # フォールバック用のデフォルトフィード
        self.default_feeds = {
            "cointelegraph": "https://cointelegraph.com/rss",
            "coindesk": "https://feeds.feedburner.com/CoinDesk",
            "bitcoin_magazine": "https://bitcoinmagazine.com/.rss/full/",
            "cryptonews": "https://cryptonews.com/news/feed/",
            "decrypt": "https://decrypt.co/feed",
            "blockworks": "https://blockworks.co/feed/",
            "the_block": "https://www.theblock.co/rss.xml"
        }
        
        # 暗号通貨関連キーワード
        self.crypto_keywords = [
            "bitcoin", "btc", "ethereum", "eth", "blockchain", "cryptocurrency", 
            "crypto", "defi", "nft", "web3", "solana", "cardano", "polygon",
            "binance", "coinbase", "exchange", "trading", "mining", "staking",
            "altcoin", "memecoin", "token", "regulation", "sec", "etf"
        ]
        
        # 重要度判定キーワード
        self.urgency_keywords = {
            "urgent": [
                "breaking", "urgent", "alert", "crash", "hack", "exploit", 
                "ban", "regulation", "sec", "lawsuit", "investigation", "scam"
            ],
            "high": [
                "surge", "rally", "breakthrough", "milestone", "launch", "update",
                "partnership", "acquisition", "investment", "funding", "ipo"
            ],
            "medium": [
                "analysis", "report", "study", "research", "interview", "opinion",
                "prediction", "forecast", "trend", "market", "price"
            ]
        }
    
    def get_feeds_from_db(self) -> Dict[str, str]:
        """データベースからアクティブなRSSフィードを取得"""
        if not self.db_session:
            logger.warning("No database session provided, using default feeds")
            return self.default_feeds
        
        try:
            from sqlalchemy import text
            result = self.db_session.execute(
                text("SELECT name, url FROM rss_sources WHERE enabled = 1 AND status = 'active'")
            )
            feeds = {row.name: row.url for row in result.fetchall()}
            
            if feeds:
                logger.info(f"Loaded {len(feeds)} RSS feeds from database")
                return feeds
            else:
                logger.warning("No active feeds found in database, using default feeds")
                return self.default_feeds
                
        except Exception as e:
            logger.error(f"Error loading feeds from database: {e}")
            return self.default_feeds
    
    def fetch_all_feeds(self) -> List[Dict[str, Any]]:
        """全てのRSSフィードから記事を取得"""
        all_articles = []
        
        # データベースからフィードを取得
        feeds = self.get_feeds_from_db()
        
        for feed_name, feed_url in feeds.items():
            try:
                logger.info(f"Fetching RSS feed: {feed_name}")
                articles = self._fetch_feed(feed_name, feed_url)
                all_articles.extend(articles)
                logger.info(f"Fetched {len(articles)} articles from {feed_name}")
            except Exception as e:
                logger.error(f"Error fetching {feed_name}: {e}")
                continue
        
        # 重複除去（タイトルベース）
        seen_titles = set()
        unique_articles = []
        for article in all_articles:
            title_key = article['title'].lower().strip()
            if title_key not in seen_titles:
                seen_titles.add(title_key)
                unique_articles.append(article)
        
        logger.info(f"Total unique articles: {len(unique_articles)}")
        return unique_articles
    
    def _fetch_feed(self, feed_name: str, feed_url: str) -> List[Dict[str, Any]]:
        """個別のRSSフィードを取得"""
        try:
            # User-Agentを設定してブロックを回避
            headers = {
                'User-Agent': 'Mozilla/5.0 (compatible; CryptoNewsBot/1.0)'
            }
            
            # feedparserを使用してRSSを解析
            feed = feedparser.parse(feed_url, request_headers=headers)
            
            if feed.bozo:
                logger.warning(f"RSS feed {feed_name} has parsing issues")
            
            articles = []
            for entry in feed.entries[:20]:  # 最新20件まで
                try:
                    article = self._parse_entry(entry, feed_name)
                    if article and self._is_crypto_related(article):
                        articles.append(article)
                except Exception as e:
                    logger.error(f"Error parsing entry from {feed_name}: {e}")
                    continue
            
            return articles
            
        except Exception as e:
            logger.error(f"Error fetching RSS feed {feed_name}: {e}")
            return []
    
    def _parse_entry(self, entry: Any, feed_name: str) -> Optional[Dict[str, Any]]:
        """RSSエントリをパース"""
        try:
            # 基本情報を抽出
            title = getattr(entry, 'title', 'No Title').strip()
            summary = getattr(entry, 'summary', getattr(entry, 'description', '')).strip()
            link = getattr(entry, 'link', '')
            
            # 日時を解析
            published_time = getattr(entry, 'published_parsed', None)
            if published_time:
                pub_date = datetime(*published_time[:6], tzinfo=timezone.utc)
            else:
                pub_date = datetime.now(timezone.utc)
            
            # HTMLタグを除去
            summary = re.sub(r'<[^>]+>', '', summary)
            summary = re.sub(r'\s+', ' ', summary).strip()
            
            # 重要度を判定
            urgency = self._calculate_urgency(title, summary)
            
            # 関連コインを抽出
            coins = self._extract_coins(title + " " + summary)
            
            return {
                'title': title,
                'summary': summary[:500] + "..." if len(summary) > 500 else summary,
                'link': link,
                'source': feed_name.replace('_', ' ').title(),
                'published_at': pub_date.strftime("%Y-%m-%d %H:%M:%S"),
                'urgency': urgency,
                'coins': coins,
                'content_type': 'news'
            }
            
        except Exception as e:
            logger.error(f"Error parsing RSS entry: {e}")
            return None
    
    def _is_crypto_related(self, article: Dict[str, Any]) -> bool:
        """記事が暗号通貨関連かどうかを判定"""
        text = (article['title'] + " " + article['summary']).lower()
        
        # 暗号通貨キーワードが含まれているかチェック
        return any(keyword in text for keyword in self.crypto_keywords)
    
    def _calculate_urgency(self, title: str, summary: str) -> str:
        """記事の重要度を計算"""
        text = (title + " " + summary).lower()
        
        # 緊急度の高いキーワードをチェック
        for urgency_level, keywords in self.urgency_keywords.items():
            if any(keyword in text for keyword in keywords):
                return urgency_level
        
        return "low"
    
    def _extract_coins(self, text: str) -> List[str]:
        """テキストから暗号通貨シンボルを抽出"""
        text = text.upper()
        
        # 主要な暗号通貨シンボル
        major_coins = [
            "BTC", "ETH", "BNB", "XRP", "ADA", "SOL", "DOGE", "DOT", "AVAX",
            "SHIB", "MATIC", "LTC", "UNI", "LINK", "ATOM", "FTT", "NEAR",
            "ALGO", "VET", "ICP", "FIL", "TRX", "ETC", "HBAR", "XLM",
            "MANA", "SAND", "AXS", "APE", "CRO", "LRC", "ENJ", "CHZ"
        ]
        
        found_coins = []
        for coin in major_coins:
            # 単語境界でマッチする正規表現
            pattern = r'\b' + re.escape(coin) + r'\b'
            if re.search(pattern, text):
                found_coins.append(coin)
        
        # Bitcoin, Ethereum等の通貨名も検出
        coin_names = {
            "BITCOIN": "BTC",
            "ETHEREUM": "ETH", 
            "BINANCE": "BNB",
            "RIPPLE": "XRP",
            "CARDANO": "ADA",
            "SOLANA": "SOL",
            "DOGECOIN": "DOGE",
            "POLKADOT": "DOT"
        }
        
        for name, symbol in coin_names.items():
            if name in text and symbol not in found_coins:
                found_coins.append(symbol)
        
        return found_coins[:5]  # 最大5つまで

# グローバルクライアントインスタンス
_rss_client = None

def get_rss_client() -> RSSClient:
    """RSSクライアントのシングルトンインスタンスを取得"""
    global _rss_client
    if _rss_client is None:
        _rss_client = RSSClient()
    return _rss_client

def fetch_crypto_news(db_session=None) -> List[Dict[str, Any]]:
    """暗号通貨ニュースを取得する便利関数"""
    client = RSSClient(db_session)
    return client.fetch_all_feeds()