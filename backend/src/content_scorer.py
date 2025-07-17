#!/usr/bin/env python3
"""
Content importance scorer for cryptocurrency articles
記事内容の重要度をスコアリングして優先度を決定
"""

import re
import logging
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class ContentScorer:
    """記事内容の重要度を分析してスコアリング"""
    
    def __init__(self):
        # 重要度別キーワード定義
        self.scoring_rules = {
            # 緊急度: URGENT (90-100点)
            "urgent": {
                "keywords": [
                    "hack", "hacked", "exploit", "breach", "stolen", "theft",
                    "crash", "collapse", "scam", "fraud", "rug pull",
                    "sec investigation", "lawsuit", "ban", "banned", "emergency",
                    "critical bug", "vulnerability", "attack", "ransomware"
                ],
                "weight": 25,
                "base_score": 90
            },
            
            # 高重要度: HIGH (70-89点)
            "high": {
                "keywords": [
                    "breaking", "announced", "launch", "launches", "released",
                    "partnership", "merger", "acquisition", "investment",
                    "etf approved", "etf approval", "regulation", "regulatory",
                    "all-time high", "ath", "new high", "record high",
                    "institutional", "whale", "major update", "upgrade",
                    "mainnet", "testnet", "halving", "hard fork"
                ],
                "weight": 15,
                "base_score": 70
            },
            
            # 中重要度: MEDIUM (50-69点)
            "medium": {
                "keywords": [
                    "surge", "rally", "gains", "rises", "increases",
                    "drops", "falls", "declines", "analysis", "prediction",
                    "forecast", "trend", "technical analysis", "resistance",
                    "support", "bullish", "bearish", "adoption", "integration",
                    "development", "roadmap", "tokenomics", "airdrop"
                ],
                "weight": 10,
                "base_score": 50
            },
            
            # 低重要度: LOW (20-49点)
            "low": {
                "keywords": [
                    "opinion", "thoughts", "believes", "expects", "might",
                    "could", "possibly", "perhaps", "interview", "podcast",
                    "conference", "event", "meetup", "community", "social",
                    "tweet", "twitter", "reddit", "discussion"
                ],
                "weight": 5,
                "base_score": 20
            }
        }
        
        # 価格変動に基づく重要度
        self.price_impact_rules = {
            "massive": {"threshold": 15.0, "bonus": 20},    # 15%以上の変動
            "significant": {"threshold": 8.0, "bonus": 15}, # 8-15%の変動
            "notable": {"threshold": 5.0, "bonus": 10},     # 5-8%の変動
            "minor": {"threshold": 2.0, "bonus": 5}         # 2-5%の変動
        }
        
        # 通貨別重要度補正
        self.coin_importance = {
            "BTC": 1.5,   # ビットコインは最重要
            "ETH": 1.4,   # イーサリアムも高重要
            "BNB": 1.2,   # その他主要通貨
            "XRP": 1.2,
            "ADA": 1.1,
            "SOL": 1.1,
            "DOGE": 1.0,  # 人気はあるが市場への影響は中程度
        }
        
        # 時間による重要度減衰
        self.time_decay = {
            "1h": 1.0,    # 1時間以内: フル重要度
            "6h": 0.9,    # 6時間以内: 90%
            "24h": 0.8,   # 24時間以内: 80%
            "48h": 0.6,   # 48時間以内: 60%
            "week": 0.4   # 1週間以内: 40%
        }
    
    def score_content(self, title: str, summary: str, coins: List[str] = None, 
                     price_change: float = None, published_time: str = None) -> Dict[str, Any]:
        """
        記事内容をスコアリングして重要度を判定
        
        Args:
            title: 記事タイトル
            summary: 記事要約
            coins: 関連する暗号通貨リスト
            price_change: 価格変動率
            published_time: 公開時刻
            
        Returns:
            スコア情報辞書
        """
        try:
            # 基本コンテンツスコア
            content_score = self._analyze_content(title, summary)
            
            # 価格変動ボーナス
            price_bonus = self._calculate_price_bonus(price_change)
            
            # 通貨重要度補正
            coin_multiplier = self._calculate_coin_importance(coins)
            
            # 時間減衰補正
            time_multiplier = self._calculate_time_decay(published_time)
            
            # 最終スコア計算
            raw_score = (content_score + price_bonus) * coin_multiplier * time_multiplier
            final_score = min(100, max(0, raw_score))  # 0-100にクランプ
            
            # 優先度決定
            priority = self._determine_priority(final_score)
            
            return {
                "score": round(final_score, 1),
                "priority": priority,
                "breakdown": {
                    "content_score": content_score,
                    "price_bonus": price_bonus,
                    "coin_multiplier": coin_multiplier,
                    "time_multiplier": time_multiplier,
                    "raw_score": raw_score
                },
                "factors": {
                    "urgent_signals": content_score >= 90,
                    "price_impact": price_change is not None and abs(price_change) >= 5.0,
                    "major_coins": bool(coins and any(coin in ["BTC", "ETH"] for coin in coins)),
                    "recent": time_multiplier >= 0.8
                }
            }
            
        except Exception as e:
            logger.error(f"Error scoring content: {e}")
            return {
                "score": 50.0,
                "priority": "medium",
                "breakdown": {},
                "factors": {},
                "error": str(e)
            }
    
    def _analyze_content(self, title: str, summary: str) -> float:
        """コンテンツ内容を分析してベーススコアを計算"""
        text = (title + " " + summary).lower()
        
        max_score = 0
        matched_category = "low"
        
        # 各カテゴリのキーワードをチェック
        for category, rules in self.scoring_rules.items():
            category_score = rules["base_score"]
            keyword_matches = 0
            
            for keyword in rules["keywords"]:
                if keyword in text:
                    keyword_matches += 1
                    category_score += rules["weight"]
            
            # このカテゴリのスコアが最高の場合
            if category_score > max_score:
                max_score = category_score
                matched_category = category
        
        logger.debug(f"Content analysis: {matched_category}, score: {max_score}")
        return min(100, max_score)
    
    def _calculate_price_bonus(self, price_change: float = None) -> float:
        """価格変動に基づくボーナスポイント計算"""
        if price_change is None:
            return 0
        
        abs_change = abs(price_change)
        
        for impact_type, rules in self.price_impact_rules.items():
            if abs_change >= rules["threshold"]:
                bonus = rules["bonus"]
                # 変動が大きいほど追加ボーナス
                if abs_change >= 20:  # 20%以上の極端な変動
                    bonus *= 1.5
                logger.debug(f"Price bonus: {bonus} for {abs_change}% change")
                return bonus
        
        return 0
    
    def _calculate_coin_importance(self, coins: List[str] = None) -> float:
        """関連通貨の重要度による補正計算"""
        if not coins:
            return 1.0
        
        max_importance = 1.0
        for coin in coins:
            importance = self.coin_importance.get(coin, 1.0)
            max_importance = max(max_importance, importance)
        
        logger.debug(f"Coin importance multiplier: {max_importance} for {coins}")
        return max_importance
    
    def _calculate_time_decay(self, published_time: str = None) -> float:
        """時間による重要度減衰計算"""
        if not published_time:
            return 1.0
        
        try:
            # published_timeをdatetimeオブジェクトに変換
            if isinstance(published_time, str):
                pub_time = datetime.fromisoformat(published_time.replace('Z', '+00:00'))
            else:
                pub_time = published_time
            
            now = datetime.now(pub_time.tzinfo)
            time_diff = now - pub_time
            
            # 時間差に基づく減衰率
            if time_diff <= timedelta(hours=1):
                multiplier = self.time_decay["1h"]
            elif time_diff <= timedelta(hours=6):
                multiplier = self.time_decay["6h"]
            elif time_diff <= timedelta(hours=24):
                multiplier = self.time_decay["24h"]
            elif time_diff <= timedelta(hours=48):
                multiplier = self.time_decay["48h"]
            elif time_diff <= timedelta(days=7):
                multiplier = self.time_decay["week"]
            else:
                multiplier = 0.2  # 1週間以上古い記事は大幅減衰
            
            logger.debug(f"Time decay: {multiplier} for {time_diff}")
            return multiplier
            
        except Exception as e:
            logger.error(f"Error calculating time decay: {e}")
            return 1.0
    
    def _determine_priority(self, score: float) -> str:
        """スコアから優先度を決定"""
        if score >= 85:
            return "urgent"
        elif score >= 70:
            return "high"
        elif score >= 50:
            return "medium"
        else:
            return "low"
    
    def batch_score_topics(self, topics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """複数のトピックを一括スコアリング"""
        scored_topics = []
        
        for topic in topics:
            try:
                # スコアリング実行
                score_result = self.score_content(
                    title=topic.get('title', ''),
                    summary=topic.get('summary', ''),
                    coins=topic.get('coins', []),
                    price_change=topic.get('primaryData', {}).get('change24h'),
                    published_time=topic.get('collectedAt')
                )
                
                # 結果をトピックに統合
                topic['score'] = score_result['score']
                topic['priority'] = score_result['priority']
                topic['scoring_breakdown'] = score_result['breakdown']
                topic['scoring_factors'] = score_result['factors']
                
                scored_topics.append(topic)
                
            except Exception as e:
                logger.error(f"Error scoring topic {topic.get('id', 'unknown')}: {e}")
                # エラーの場合はデフォルト値を設定
                topic['score'] = 50
                topic['priority'] = 'medium'
                scored_topics.append(topic)
        
        # スコア順にソート
        scored_topics.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        return scored_topics

# グローバルスコアラーインスタンス
_scorer = None

def get_content_scorer() -> ContentScorer:
    """コンテンツスコアラーのシングルトンインスタンスを取得"""
    global _scorer
    if _scorer is None:
        _scorer = ContentScorer()
    return _scorer

def score_topic_content(title: str, summary: str, **kwargs) -> Dict[str, Any]:
    """トピック内容をスコアリングする便利関数"""
    return get_content_scorer().score_content(title, summary, **kwargs)