#!/usr/bin/env python3
"""
Dynamic topic generator for cryptocurrency articles
市場データに基づいて動的にトピックを生成する
"""

import uuid
import logging
import asyncio
import concurrent.futures
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from .external_apis.coingecko_client import get_market_data, get_trending_coins, get_global_data
from .external_apis.rss_client import fetch_crypto_news
from .content_scorer import get_content_scorer

logger = logging.getLogger(__name__)

class TopicGenerator:
    """動的トピック生成エンジン"""
    
    def __init__(self):
        self.price_change_thresholds = {
            "massive": 20.0,    # 大幅変動
            "significant": 10.0, # 大きな変動
            "notable": 5.0      # 注目すべき変動
        }
        
        self.psychological_levels = {
            "bitcoin": [50000, 60000, 70000, 80000, 100000],
            "ethereum": [3000, 4000, 5000, 6000],
            "binancecoin": [500, 600, 700, 800],
        }
    
    def generate_all_topics(self, db_session=None) -> List[Dict[str, Any]]:
        """すべてのシナリオからトピックを生成"""
        topics = []
        
        try:
            # 外部API呼び出しを並列化
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                # API呼び出しを同時実行
                future_market = executor.submit(get_market_data, limit=50)
                future_trending = executor.submit(get_trending_coins)
                future_global = executor.submit(get_global_data)
                
                # 結果を取得（タイムアウト設定）
                try:
                    market_data = future_market.result(timeout=10)
                except concurrent.futures.TimeoutError:
                    logger.warning("Market data API timeout")
                    market_data = None
                
                try:
                    trending_data = future_trending.result(timeout=10)
                except concurrent.futures.TimeoutError:
                    logger.warning("Trending data API timeout")
                    trending_data = None
                
                try:
                    global_data = future_global.result(timeout=10)
                except concurrent.futures.TimeoutError:
                    logger.warning("Global data API timeout")
                    global_data = None
            
            if market_data:
                # シナリオ1: 急騰・急落コイン
                topics.extend(self._generate_price_movement_topics(market_data))
                
                # シナリオ2: 主要通貨の節目価格
                topics.extend(self._generate_psychological_level_topics(market_data))
                
                # シナリオ3: 市場分析トピック
                topics.extend(self._generate_market_analysis_topics(market_data, global_data))
            
            if trending_data:
                # シナリオ4: トレンドコイン
                topics.extend(self._generate_trending_topics(trending_data))
            
            # シナリオ5: RSSニュースからのトピック生成
            topics.extend(self._generate_news_topics(db_session))
            
            # シナリオ6: 定期レポート（常に生成）
            topics.extend(self._generate_regular_report_topics(market_data, global_data))
            
            # 全てのトピックをスコアリング
            scorer = get_content_scorer()
            topics = scorer.batch_score_topics(topics)
            
            logger.info(f"Generated {len(topics)} topics from market data")
            return topics[:50]  # 最大50件に制限
            
        except ConnectionError as e:
            logger.error(f"API connection error while generating topics: {e}")
            # フォールバック: 基本的なトピックを生成
            return self._generate_fallback_topics()
        except ValueError as e:
            logger.error(f"Data format error while generating topics: {e}")
            return self._generate_fallback_topics()
        except Exception as e:
            logger.error(f"Unexpected error generating topics: {e}", exc_info=True)
            return self._generate_fallback_topics()
    
    def _generate_price_movement_topics(self, market_data: List[Dict]) -> List[Dict[str, Any]]:
        """価格変動に基づくトピックを生成"""
        topics = []
        
        # 24時間での価格変動でソート
        sorted_by_change = sorted(
            market_data, 
            key=lambda x: abs(x.get('price_change_percentage_24h', 0) or 0), 
            reverse=True
        )
        
        # 上位の急騰・急落コインを分析
        for i, coin in enumerate(sorted_by_change[:15]):
            change_24h = coin.get('price_change_percentage_24h', 0) or 0
            abs_change = abs(change_24h)
            
            if abs_change < self.price_change_thresholds["notable"]:
                continue
            
            # 変動の程度を判定
            intensity = "massive" if abs_change >= self.price_change_thresholds["massive"] else \
                       "significant" if abs_change >= self.price_change_thresholds["significant"] else "notable"
            
            direction = "急騰" if change_24h > 0 else "急落"
            emoji = "🚀" if change_24h > 0 else "📉"
            
            topic = {
                "id": f"price_movement_{coin['id']}_{datetime.now().strftime('%Y%m%d')}",
                "title": f"{emoji} {direction}分析：{coin['name']}({coin['symbol'].upper()})が24時間で{change_24h:.1f}%の大幅変動",
                "priority": "urgent" if intensity == "massive" else "high" if intensity == "significant" else "medium",
                "score": min(100, int(abs_change * 3)),  # 変動率に基づくスコア
                "coins": [coin['symbol'].upper()],
                "collectedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                "source": "CoinGecko市場データ",
                "sourceUrl": f"https://www.coingecko.com/en/coins/{coin['id']}",
                "summary": f"{coin['name']}が{direction}。その背景要因と今後の価格動向を分析します。",
                "type": "analysis",
                "question": f"なぜ{coin['name']}は{direction}したのか？今後の価格予想は？",
                "primaryData": {
                    "coin": coin['symbol'].upper(),
                    "change24h": change_24h,
                    "currentPrice": coin.get('current_price', 0),
                    "volume24h": f"${coin.get('total_volume', 0):,.0f}",
                    "marketCap": coin.get('market_cap', 0),
                    "marketCapRank": coin.get('market_cap_rank', 0)
                },
                "estimatedReadTime": 6 if intensity == "massive" else 5
            }
            topics.append(topic)
        
        return topics
    
    def _generate_psychological_level_topics(self, market_data: List[Dict]) -> List[Dict[str, Any]]:
        """心理的節目価格に基づくトピックを生成"""
        topics = []
        
        for coin in market_data[:10]:  # 主要コインのみチェック
            coin_id = coin['id']
            current_price = coin.get('current_price', 0)
            
            if coin_id in self.psychological_levels:
                levels = self.psychological_levels[coin_id]
                
                # 現在価格の近くの節目価格を確認
                for level in levels:
                    # 節目価格の±5%以内かチェック
                    if abs(current_price - level) / level <= 0.05:
                        breakthrough = "突破" if current_price > level else "到達"
                        emoji = "💥" if current_price > level else "🎯"
                        
                        topic = {
                            "id": f"psychological_level_{coin_id}_{level}_{datetime.now().strftime('%Y%m%d')}",
                            "title": f"{emoji} {coin['name']}({coin['symbol'].upper()})が心理的節目${level:,}を{breakthrough}",
                            "priority": "high",
                            "score": 90,
                            "coins": [coin['symbol'].upper()],
                            "collectedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                            "source": "CoinGecko価格データ",
                            "sourceUrl": f"https://www.coingecko.com/en/coins/{coin['id']}",
                            "summary": f"{coin['name']}が重要な価格ラインを{breakthrough}。市場への影響と今後の展望を分析します。",
                            "type": "analysis",
                            "question": f"${level:,}{breakthrough}が市場に与える影響は？次のレジスタンスはどこ？",
                            "primaryData": {
                                "coin": coin['symbol'].upper(),
                                "change24h": coin.get('price_change_percentage_24h', 0),
                                "currentPrice": current_price,
                                "volume24h": f"${coin.get('total_volume', 0):,.0f}",
                                "psychologicalLevel": level,
                                "breakthrough": breakthrough
                            },
                            "estimatedReadTime": 7
                        }
                        topics.append(topic)
                        break  # 1つのコインにつき1つの節目のみ
        
        return topics
    
    def _generate_market_analysis_topics(self, market_data: List[Dict], global_data: Optional[Dict]) -> List[Dict[str, Any]]:
        """市場全体の分析トピックを生成"""
        topics = []
        
        if not global_data or 'data' not in global_data:
            return topics
        
        market_cap_data = global_data['data']
        btc_dominance = market_cap_data.get('market_cap_percentage', {}).get('btc', 0)
        
        # ビットコインドミナンス分析
        if btc_dominance:
            dominance_status = "高水準" if btc_dominance > 50 else "低水準" if btc_dominance < 40 else "中程度"
            
            topic = {
                "id": f"btc_dominance_{datetime.now().strftime('%Y%m%d')}",
                "title": f"📊 ビットコインドミナンス{btc_dominance:.1f}%で{dominance_status}を維持",
                "priority": "medium",
                "score": 75,
                "coins": ["BTC"],
                "collectedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                "source": "CoinGecko市場データ",
                "summary": f"現在のビットコインドミナンス{btc_dominance:.1f}%が示す市場構造を分析します。",
                "type": "analysis",
                "question": "ビットコインドミナンスの変化は何を意味するのか？",
                "primaryData": {
                    "btcDominance": btc_dominance,
                    "totalMarketCap": market_cap_data.get('total_market_cap', {}).get('usd', 0),
                    "total24hVolume": market_cap_data.get('total_volume', {}).get('usd', 0)
                },
                "estimatedReadTime": 5
            }
            topics.append(topic)
        
        return topics
    
    def _generate_trending_topics(self, trending_data: Dict) -> List[Dict[str, Any]]:
        """トレンドコインに基づくトピックを生成"""
        topics = []
        
        if 'coins' not in trending_data:
            return topics
        
        trending_coins = trending_data['coins'][:3]  # 上位3つのトレンドコイン
        
        for i, trend_coin in enumerate(trending_coins):
            coin_data = trend_coin.get('item', {})
            
            topic = {
                "id": f"trending_{coin_data.get('id', 'unknown')}_{datetime.now().strftime('%Y%m%d')}",
                "title": f"🔥 急上昇トレンド：{coin_data.get('name', 'Unknown')}({coin_data.get('symbol', 'N/A')})が検索ランキング{i+1}位",
                "priority": "high" if i == 0 else "medium",
                "score": 85 - (i * 5),
                "coins": [coin_data.get('symbol', 'N/A')],
                "collectedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                "source": "CoinGeckoトレンド",
                "summary": f"{coin_data.get('name', 'Unknown')}が急激に注目を集めています。その理由と将来性を分析します。",
                "type": "standard",
                "primaryData": {
                    "coin": coin_data.get('symbol', 'N/A'),
                    "trendRank": i + 1,
                    "marketCapRank": coin_data.get('market_cap_rank'),
                    "coinId": coin_data.get('id')
                },
                "estimatedReadTime": 4
            }
            topics.append(topic)
        
        return topics
    
    def _generate_news_topics(self, db_session=None) -> List[Dict[str, Any]]:
        """RSSニュースからトピックを生成"""
        topics = []
        
        try:
            logger.info("Fetching RSS news for topic generation...")
            news_articles = fetch_crypto_news(db_session)
            
            # 最新の記事から選別（最大15件）
            for article in news_articles[:15]:
                try:
                    # ニュース記事をトピック形式に変換
                    topic = {
                        "id": f"news_{abs(hash(article['title']))}_{datetime.now().strftime('%Y%m%d')}",
                        "title": f"📰 {article['title']}",
                        "priority": article.get('urgency', 'medium'),
                        "score": 60,  # 暫定スコア（後でスコアリングシステムが更新）
                        "coins": article.get('coins', []),
                        "collectedAt": article.get('published_at', datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")),
                        "source": f"📡 {article['source']}",
                        "sourceUrl": article.get('link', ''),
                        "summary": article['summary'],
                        "type": "news",
                        "primaryData": {
                            "newsSource": article['source'],
                            "urgency": article.get('urgency', 'medium'),
                            "contentType": "news"
                        },
                        "estimatedReadTime": max(2, len(article['summary'].split()) // 200)
                    }
                    topics.append(topic)
                    
                except KeyError as e:
                    logger.debug(f"Missing key in news article: {e}")
                    continue
                except Exception as e:
                    logger.error(f"Unexpected error converting news article to topic: {e}", exc_info=True)
                    continue
            
            logger.info(f"Generated {len(topics)} news topics")
            return topics
            
        except ConnectionError as e:
            logger.error(f"RSS feed connection error: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error generating news topics: {e}", exc_info=True)
            return []
    
    def _generate_regular_report_topics(self, market_data: Optional[List[Dict]], global_data: Optional[Dict]) -> List[Dict[str, Any]]:
        """定期レポートトピックを生成"""
        topics = []
        
        # 日次市場サマリー
        today = datetime.now().strftime('%Y年%m月%d日')
        
        topic = {
            "id": f"daily_report_{datetime.now().strftime('%Y%m%d')}",
            "title": f"📈 {today}の暗号通貨市場サマリー：主要コインの動向と注目ポイント",
            "priority": "medium",
            "score": 70,
            "coins": ["BTC", "ETH"],
            "collectedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "source": "市場データ統合",
            "summary": f"{today}の暗号通貨市場全体の動向をまとめます。主要通貨の価格変動と今後の注目ポイントを解説。",
            "type": "analysis",
            "question": "今日の市場で何が起きたのか？明日以降の展望は？",
            "primaryData": {
                "reportDate": today,
                "marketDataAvailable": market_data is not None,
                "globalDataAvailable": global_data is not None
            },
            "estimatedReadTime": 6
        }
        topics.append(topic)
        
        return topics
    
    def _generate_fallback_topics(self) -> List[Dict[str, Any]]:
        """APIエラー時のフォールバックトピック"""
        return [
            {
                "id": f"fallback_btc_{datetime.now().strftime('%Y%m%d')}",
                "title": "📊 ビットコイン市場分析：現在の価格動向と今後の展望",
                "priority": "medium",
                "score": 75,
                "coins": ["BTC"],
                "collectedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                "source": "基本分析",
                "summary": "ビットコインの現在の市場状況と今後の価格動向について分析します。",
                "type": "analysis",
                "question": "ビットコインの現在の状況は？今後どう動く？",
                "primaryData": {
                    "coin": "BTC",
                    "fallback": True
                },
                "estimatedReadTime": 5
            },
            {
                "id": f"fallback_eth_{datetime.now().strftime('%Y%m%d')}",
                "title": "🔮 イーサリアム技術解説：最新のアップデートとDeFiへの影響",
                "priority": "medium", 
                "score": 70,
                "coins": ["ETH"],
                "collectedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                "source": "技術分析",
                "summary": "イーサリアムの最新技術動向とDeFiエコシステムへの影響を解説します。",
                "type": "technical",
                "primaryData": {
                    "coin": "ETH",
                    "fallback": True
                },
                "estimatedReadTime": 6
            }
        ]

# グローバルジェネレーターインスタンス
_generator = None

def get_generator() -> TopicGenerator:
    """トピックジェネレーターのシングルトンインスタンスを取得"""
    global _generator
    if _generator is None:
        _generator = TopicGenerator()
    return _generator

def generate_topics_from_market_data(db_session=None) -> List[Dict[str, Any]]:
    """市場データからトピックを生成する便利関数"""
    return get_generator().generate_all_topics(db_session)