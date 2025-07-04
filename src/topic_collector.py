#!/usr/bin/env python3
"""
暗号通貨記事のネタ（トピック）を自動収集するシステム
複数のデータソースから記事のネタを収集し、優先順位をつけて管理
"""

import os
import json
import datetime
import feedparser
import requests
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import time
from collections import defaultdict
import re
from dotenv import load_dotenv

load_dotenv()


class TopicSource(Enum):
    """トピックの情報源"""
    RSS_FEED = "rss_feed"
    PRICE_API = "price_api"
    SOCIAL_MEDIA = "social_media"
    NEWS_API = "news_api"
    ONCHAIN_DATA = "onchain_data"


class TopicPriority(Enum):
    """トピックの優先度"""
    URGENT = 5      # 緊急（大きな価格変動、重大ニュース）
    HIGH = 4        # 高（重要なアップデート、市場動向）
    MEDIUM = 3      # 中（一般的なニュース、分析）
    LOW = 2         # 低（教育的コンテンツ、定期レポート）
    SCHEDULED = 1   # 定期（定期的な市場レポート）


@dataclass
class CollectedTopic:
    """収集されたトピック"""
    title: str
    source: TopicSource
    source_url: Optional[str]
    priority: TopicPriority
    coins: List[str]  # 関連する暗号通貨シンボル
    keywords: List[str]
    summary: Optional[str]
    collected_at: datetime.datetime
    data: Dict = field(default_factory=dict)  # 追加データ（価格、変動率など）
    score: float = 0.0  # トピックの重要度スコア


class RSSFeedCollector:
    """RSSフィードからトピックを収集"""
    
    def __init__(self):
        self.feed_urls = [
            "https://cointelegraph.com/rss",
            "https://www.coindesk.com/arc/outboundfeeds/rss/",
            "https://decrypt.co/feed",
            "https://bitcoinmagazine.com/feed",
            # 日本語メディア
            "https://coinpost.jp/?feed=rss2",
            "https://crypto.watch.impress.co.jp/data/rss/1.0/cda/feed.rdf"
        ]
        
        # 暗号通貨の名前とシンボルのマッピング
        self.crypto_mapping = {
            "bitcoin": "BTC",
            "ethereum": "ETH",
            "ripple": "XRP",
            "cardano": "ADA",
            "solana": "SOL",
            "polkadot": "DOT",
            "chainlink": "LINK",
            "binance": "BNB",
            "polygon": "MATIC",
            "avalanche": "AVAX",
            "ビットコイン": "BTC",
            "イーサリアム": "ETH",
            "リップル": "XRP",
            "ソラナ": "SOL",
        }
    
    def collect(self) -> List[CollectedTopic]:
        """RSSフィードからトピックを収集"""
        topics = []
        
        for feed_url in self.feed_urls:
            try:
                print(f"Collecting from RSS: {feed_url}")
                feed = feedparser.parse(feed_url)
                
                for entry in feed.entries[:10]:  # 最新10件を取得
                    topic = self._parse_entry(entry, feed_url)
                    if topic:
                        topics.append(topic)
                
                time.sleep(1)  # レート制限対策
                
            except Exception as e:
                print(f"Error collecting from {feed_url}: {e}")
        
        return topics
    
    def _parse_entry(self, entry: Dict, source_url: str) -> Optional[CollectedTopic]:
        """RSSエントリーをトピックに変換"""
        try:
            title = entry.get('title', '')
            summary = entry.get('summary', '')
            link = entry.get('link', '')
            published = entry.get('published_parsed', None)
            
            if not title:
                return None
            
            # 関連する暗号通貨を抽出
            coins = self._extract_coins(title + " " + summary)
            
            # キーワードを抽出
            keywords = self._extract_keywords(title + " " + summary)
            
            # 優先度を判定
            priority = self._determine_priority(title, summary)
            
            # 公開時刻を取得
            if published:
                published_dt = datetime.datetime(*published[:6])
            else:
                published_dt = datetime.datetime.now()
            
            return CollectedTopic(
                title=title,
                source=TopicSource.RSS_FEED,
                source_url=link,
                priority=priority,
                coins=coins,
                keywords=keywords,
                summary=summary[:200] if summary else None,
                collected_at=published_dt,
                data={'feed_url': source_url}
            )
            
        except Exception as e:
            print(f"Error parsing entry: {e}")
            return None
    
    def _extract_coins(self, text: str) -> List[str]:
        """テキストから暗号通貨シンボルを抽出"""
        coins = []
        text_lower = text.lower()
        
        for name, symbol in self.crypto_mapping.items():
            if name in text_lower and symbol not in coins:
                coins.append(symbol)
        
        # 大文字のシンボルも直接検索
        pattern = r'\b([A-Z]{3,5})\b'
        matches = re.findall(pattern, text)
        for match in matches:
            if match in ['BTC', 'ETH', 'XRP', 'ADA', 'SOL', 'DOT', 'LINK', 'BNB', 'MATIC', 'AVAX']:
                if match not in coins:
                    coins.append(match)
        
        return coins
    
    def _extract_keywords(self, text: str) -> List[str]:
        """テキストからキーワードを抽出"""
        keywords = []
        
        # 重要なキーワード
        important_terms = [
            '価格', '上昇', '下落', '急騰', '急落', '最高値', '最安値',
            'price', 'surge', 'crash', 'pump', 'dump', 'ATH', 'breakout',
            'ハッキング', 'hack', '規制', 'regulation', 'SEC', 'ETF',
            'アップデート', 'update', 'upgrade', 'launch', 'listing',
            'DeFi', 'NFT', 'メタバース', 'metaverse', 'AI',
            '半減期', 'halving', 'マイニング', 'mining',
            'ステーキング', 'staking', 'イールド', 'yield'
        ]
        
        text_lower = text.lower()
        for term in important_terms:
            if term.lower() in text_lower:
                keywords.append(term)
        
        return keywords[:5]  # 最大5個まで
    
    def _determine_priority(self, title: str, summary: str) -> TopicPriority:
        """記事の優先度を判定"""
        text = (title + " " + summary).lower()
        
        # 緊急キーワード
        urgent_keywords = [
            'breaking', '速報', 'ハッキング', 'hack', 'crash', '急落',
            '規制', 'ban', '禁止', 'emergency', '緊急'
        ]
        
        # 高優先度キーワード
        high_keywords = [
            '最高値', 'ATH', 'surge', '急騰', 'launch', 'listing',
            'partnership', '提携', 'upgrade', 'アップグレード'
        ]
        
        # 中優先度キーワード
        medium_keywords = [
            'analysis', '分析', 'report', 'レポート', 'trend', 'トレンド'
        ]
        
        for keyword in urgent_keywords:
            if keyword in text:
                return TopicPriority.URGENT
        
        for keyword in high_keywords:
            if keyword in text:
                return TopicPriority.HIGH
        
        for keyword in medium_keywords:
            if keyword in text:
                return TopicPriority.MEDIUM
        
        return TopicPriority.LOW


class PriceDataCollector:
    """価格データからトピックを生成"""
    
    def __init__(self):
        self.api_key = os.getenv('COINMARKETCAP_API_KEY')
        self.base_url = 'https://pro-api.coinmarketcap.com/v1'
        
        # 代替として無料のCoinGecko APIを使用
        self.coingecko_url = 'https://api.coingecko.com/api/v3'
        
        # ハイブリッド型トピック用の分析テーマ（問いかけ）
        self.analysis_angles = [
            "なぜ価格は{direction}したのか？考えられる3つの要因",
            "今後の価格はどうなる？テクニカル分析と市場心理",
            "専門家の意見まとめ：{symbol}は今が買い時か？",
            "この{direction}は続く？オンチェーンデータから読み解く",
            "クジラ（大口投資家）の動き：{symbol}の大量取引はあったか？",
            "{symbol}の{direction}が他の暗号通貨に与える影響とは？"
        ]
    
    def collect(self) -> List[CollectedTopic]:
        """価格変動からトピックを生成"""
        topics = []
        
        try:
            # CoinGecko APIから価格データを取得
            price_movers = self._get_price_movers()
            
            # 大きな価格変動をトピック化
            for mover in price_movers:
                # 1. 既存の価格変動トピックを生成
                topic = self._create_price_topic(mover)
                if topic:
                    topics.append(topic)
                
                # 2. ハイブリッド型（分析・問いかけ）トピックを生成
                hybrid_topics = self._create_hybrid_topics(mover)
                topics.extend(hybrid_topics)
            
            # トレンドコインを取得
            trending = self._get_trending_coins()
            for coin in trending:
                topic = self._create_trending_topic(coin)
                if topic:
                    topics.append(topic)
                    
        except Exception as e:
            print(f"Error collecting price data: {e}")
        
        return topics
    
    def _get_price_movers(self) -> List[Dict]:
        """価格変動の大きいコインを取得"""
        try:
            # 上位100コインの価格データを取得
            url = f"{self.coingecko_url}/coins/markets"
            params = {
                'vs_currency': 'usd',
                'order': 'market_cap_desc',
                'per_page': 100,
                'page': 1,
                'sparkline': False,
                'price_change_percentage': '24h'
            }
            
            response = requests.get(url, params=params)
            if response.status_code == 200:
                coins = response.json()
                
                # 24時間で10%以上変動したコインを抽出
                movers = []
                for coin in coins:
                    change_24h = coin.get('price_change_percentage_24h', 0)
                    if abs(change_24h) >= 10:
                        movers.append({
                            'id': coin['id'],
                            'symbol': coin['symbol'].upper(),
                            'name': coin['name'],
                            'price': coin['current_price'],
                            'change_24h': change_24h,
                            'volume': coin['total_volume'],
                            'market_cap': coin['market_cap']
                        })
                
                return sorted(movers, key=lambda x: abs(x['change_24h']), reverse=True)[:10]
            
        except Exception as e:
            print(f"Error getting price movers: {e}")
        
        return []
    
    def _get_trending_coins(self) -> List[Dict]:
        """トレンドのコインを取得"""
        try:
            url = f"{self.coingecko_url}/search/trending"
            response = requests.get(url)
            
            if response.status_code == 200:
                data = response.json()
                trending = []
                
                for item in data.get('coins', [])[:5]:
                    coin = item['item']
                    trending.append({
                        'symbol': coin['symbol'],
                        'name': coin['name'],
                        'market_cap_rank': coin.get('market_cap_rank', 0)
                    })
                
                return trending
                
        except Exception as e:
            print(f"Error getting trending coins: {e}")
        
        return []
    
    def _create_price_topic(self, mover: Dict) -> Optional[CollectedTopic]:
        """価格変動からトピックを作成"""
        change = mover['change_24h']
        direction = "急騰" if change > 0 else "急落"
        
        title = f"{mover['name']}（{mover['symbol']}）が24時間で{abs(change):.1f}%{direction}"
        
        # 優先度を設定
        if abs(change) >= 20:
            priority = TopicPriority.URGENT
        elif abs(change) >= 15:
            priority = TopicPriority.HIGH
        else:
            priority = TopicPriority.MEDIUM
        
        keywords = [direction, "価格変動", "market", mover['name']]
        if change > 0:
            keywords.extend(["bullish", "上昇"])
        else:
            keywords.extend(["bearish", "下落"])
        
        # CoinGeckoの詳細ページURLを生成
        coin_id = mover.get('id', mover['name'].lower().replace(' ', '-'))
        source_url = f"https://www.coingecko.com/ja/coins/{coin_id}"
        
        return CollectedTopic(
            title=title,
            source=TopicSource.PRICE_API,
            source_url=source_url,
            priority=priority,
            coins=[mover['symbol']],
            keywords=keywords,
            summary=f"過去24時間で{change:+.1f}%の変動。現在価格: ${mover['price']:,.2f}",
            collected_at=datetime.datetime.now(),
            data={
                'price': mover['price'],
                'change_24h': change,
                'volume': mover['volume'],
                'market_cap': mover['market_cap'],
                'coin_id': coin_id
            },
            score=abs(change)  # 変動率をスコアとして使用
        )
    
    def _create_trending_topic(self, coin: Dict) -> Optional[CollectedTopic]:
        """トレンドコインからトピックを作成"""
        title = f"{coin['name']}（{coin['symbol']}）が注目を集める - トレンド入り"
        
        # CoinGeckoの詳細ページURLを生成
        coin_id = coin.get('id', coin['name'].lower().replace(' ', '-'))
        source_url = f"https://www.coingecko.com/ja/coins/{coin_id}"
        
        return CollectedTopic(
            title=title,
            source=TopicSource.SOCIAL_MEDIA,
            source_url=source_url,
            priority=TopicPriority.HIGH,
            coins=[coin['symbol']],
            keywords=["trending", "注目", "話題", coin['name']],
            summary=f"CoinGeckoのトレンドランキングに登場。時価総額ランク: {coin.get('market_cap_rank', 'N/A')}",
            collected_at=datetime.datetime.now(),
            data={'market_cap_rank': coin.get('market_cap_rank', 0), 'coin_id': coin_id},
            score=50  # トレンド入りは高スコア
        )
    
    def _create_hybrid_topics(self, mover: Dict) -> List[CollectedTopic]:
        """価格変動データと分析テーマを組み合わせてハイブリッドトピックを生成"""
        hybrid_topics = []
        change = mover['change_24h']
        direction = "急騰" if change > 0 else "急落"
        
        # 分析テーマを選択（変動率によって数を調整）
        num_angles = 3 if abs(change) >= 15 else 2  # 大きな変動ほど多くの角度
        selected_angles = self.analysis_angles[:num_angles]
        
        for angle_template in selected_angles:
            # タイトルを生成
            analysis_title = angle_template.format(
                symbol=mover['symbol'],
                direction=direction
            )
            
            # プレフィックスを追加して、元のコイン名と変動率を明確にする
            full_title = f"{mover['name']}が{abs(change):.1f}%{direction}：{analysis_title}"
            
            # 優先度は元の価格変動に連動させる
            if abs(change) >= 20:
                priority = TopicPriority.URGENT
            elif abs(change) >= 15:
                priority = TopicPriority.HIGH
            else:
                priority = TopicPriority.MEDIUM
            
            # キーワードを追加（分析系のキーワードを強化）
            keywords = [
                "分析", "考察", "見通し", "要因", mover['name'], mover['symbol'],
                "テクニカル分析", "ファンダメンタルズ", "市場心理"
            ]
            if direction == "急騰":
                keywords.extend(["上昇要因", "bullish", "買い時"])
            else:
                keywords.extend(["下落要因", "bearish", "リスク"])
            
            # CoinGeckoの詳細ページURLを生成
            coin_id = mover.get('id', mover['name'].lower().replace(' ', '-'))
            source_url = f"https://www.coingecko.com/ja/coins/{coin_id}"
            
            # 分析フレームワークを提案
            if "3つの要因" in analysis_title:
                suggested_structure = ["価格変動の概要", "技術的要因", "ファンダメンタル要因", "市場心理的要因", "今後の展望"]
            elif "テクニカル分析" in analysis_title:
                suggested_structure = ["現在の価格状況", "チャート分析", "サポート・レジスタンス", "予想シナリオ"]
            elif "買い時" in analysis_title:
                suggested_structure = ["現在の投資環境", "専門家の見解", "リスク要因", "投資判断のポイント"]
            else:
                suggested_structure = ["背景説明", "詳細分析", "今後の見通し"]
            
            topic = CollectedTopic(
                title=full_title,
                source=TopicSource.PRICE_API,  # ソースはPRICE_APIのまま
                source_url=source_url,
                priority=priority,
                coins=[mover['symbol']],
                keywords=keywords,
                summary=f"{mover['name']}の{direction}（{change:+.1f}%）について、{analysis_title.lower()}。データに基づいた詳細な分析記事の執筆が推奨されます。",
                collected_at=datetime.datetime.now(),
                data={
                    **mover,  # 元の価格データを保持
                    'analysis_type': 'hybrid',
                    'suggested_structure': suggested_structure,
                    'analysis_angle': analysis_title
                },
                score=abs(change) * 0.9  # 分析系は少しスコアを調整（0.9倍）
            )
            hybrid_topics.append(topic)
        
        return hybrid_topics


class TopicManager:
    """トピックの管理と優先順位付け"""
    
    def __init__(self):
        self.topics: List[CollectedTopic] = []
        self.processed_titles: set = set()  # 重複防止
        self.topic_history: Dict[str, datetime.datetime] = {}  # 同じトピックの履歴
        
        # 初期化時にモックデータを生成
        self._generate_mock_topics()
    
    def add_topics(self, topics: List[CollectedTopic]):
        """トピックを追加（重複チェック付き）"""
        for topic in topics:
            if self._is_duplicate(topic):
                continue
            
            # スコアを計算
            topic.score = self._calculate_score(topic)
            
            self.topics.append(topic)
            self.processed_titles.add(topic.title.lower())
            self.topic_history[topic.title.lower()] = topic.collected_at
    
    def _is_duplicate(self, topic: CollectedTopic) -> bool:
        """重複チェック"""
        title_lower = topic.title.lower()
        
        # 完全一致チェック
        if title_lower in self.processed_titles:
            return True
        
        # 類似度チェック（簡易版）
        for processed_title in self.processed_titles:
            similarity = self._calculate_similarity(title_lower, processed_title)
            if similarity > 0.8:  # 80%以上類似
                return True
        
        return False
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """2つのテキストの類似度を計算（簡易版）"""
        words1 = set(text1.split())
        words2 = set(text2.split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union)
    
    def _calculate_score(self, topic: CollectedTopic) -> float:
        """トピックのスコアを計算"""
        score = 0.0
        
        # 優先度によるベーススコア
        priority_scores = {
            TopicPriority.URGENT: 100,
            TopicPriority.HIGH: 80,
            TopicPriority.MEDIUM: 60,
            TopicPriority.LOW: 40,
            TopicPriority.SCHEDULED: 20
        }
        score += priority_scores[topic.priority]
        
        # 時間による減衰（古いニュースはスコアが下がる）
        hours_old = (datetime.datetime.now() - topic.collected_at).total_seconds() / 3600
        time_decay = max(0.3, 1 - (hours_old / 72))  # 72時間でも30%は残る
        score *= time_decay
        
        # キーワード数によるボーナス
        score += len(topic.keywords) * 2
        
        # 関連コイン数によるボーナス
        score += len(topic.coins) * 5
        
        # 既存のスコアがある場合は加算
        if topic.score > 0:
            score += topic.score * 0.1
        
        return score
    
    def get_top_topics(self, count: int = 10, min_score: float = 10) -> List[CollectedTopic]:
        """スコアの高いトピックを取得"""
        # スコアでソート
        sorted_topics = sorted(
            [t for t in self.topics if t.score >= min_score],
            key=lambda x: x.score,
            reverse=True
        )
        
        return sorted_topics[:count]
    
    def get_topics_by_coin(self, coin_symbol: str) -> List[CollectedTopic]:
        """特定のコインに関するトピックを取得"""
        return [t for t in self.topics if coin_symbol in t.coins]
    
    def save_topics(self, filename: str = "collected_topics.json"):
        """トピックをファイルに保存"""
        data = []
        for topic in self.topics:
            data.append({
                'title': topic.title,
                'source': topic.source.value,
                'source_url': topic.source_url,
                'priority': topic.priority.value,
                'coins': topic.coins,
                'keywords': topic.keywords,
                'summary': topic.summary,
                'collected_at': topic.collected_at.isoformat(),
                'data': topic.data,
                'score': topic.score
            })
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def generate_topic_report(self) -> str:
        """トピックのレポートを生成"""
        report = []
        report.append(f"収集されたトピック総数: {len(self.topics)}")
        report.append("")
        
        # 優先度別の集計
        priority_count = defaultdict(int)
        for topic in self.topics:
            priority_count[topic.priority] += 1
        
        report.append("優先度別トピック数:")
        for priority in TopicPriority:
            count = priority_count[priority]
            report.append(f"  {priority.name}: {count}")
        
        report.append("")
        
        # ソース別の集計
        source_count = defaultdict(int)
        for topic in self.topics:
            source_count[topic.source] += 1
        
        report.append("ソース別トピック数:")
        for source in TopicSource:
            count = source_count[source]
            report.append(f"  {source.name}: {count}")
        
        report.append("")
        
        # トップ10トピック
        report.append("スコア上位のトピック:")
        top_topics = self.get_top_topics(10)
        for i, topic in enumerate(top_topics, 1):
            report.append(f"{i}. [{topic.priority.name}] {topic.title} (スコア: {topic.score:.1f})")
            if topic.coins:
                report.append(f"   関連: {', '.join(topic.coins)}")
        
        return '\n'.join(report)
    
    def _generate_mock_topics(self):
        """開発用のモックトピックを生成"""
        import random
        
        mock_topics = [
            # ビットコイン関連
            ("ビットコイン価格が再び60,000ドルを突破、機関投資家の買いが加速", ["BTC"], TopicPriority.URGENT),
            ("ビットコインETF承認への期待が高まる、SEC委員長が前向きな発言", ["BTC"], TopicPriority.HIGH),
            ("マイクロストラテジーがビットコインを追加購入、総保有量が15万BTCに", ["BTC"], TopicPriority.HIGH),
            ("ビットコインのハッシュレートが過去最高を更新、ネットワークセキュリティが向上", ["BTC"], TopicPriority.MEDIUM),
            ("ビットコインの取引手数料が急上昇、mempool混雑が原因", ["BTC"], TopicPriority.MEDIUM),
            
            # イーサリアム関連
            ("イーサリアム2.0のシャーディング実装が2024年に延期、開発チームが発表", ["ETH"], TopicPriority.HIGH),
            ("イーサリアムのガス手数料が大幅に低下、Layer2ソリューションの普及が影響", ["ETH"], TopicPriority.MEDIUM),
            ("DeFiプロトコルUniswapでの取引量が過去最高を記録", ["ETH", "UNI"], TopicPriority.HIGH),
            ("イーサリアム財団が新しい研究助成プログラムを発表", ["ETH"], TopicPriority.MEDIUM),
            ("NFTマーケットOpenSeaがイーサリアムL2への完全移行を検討", ["ETH"], TopicPriority.MEDIUM),
            
            # アルトコイン関連
            ("Solanaネットワークが24時間のダウンタイムから復旧、原因は調査中", ["SOL"], TopicPriority.URGENT),
            ("CardanoのHydraアップデートが正式にローンチ、スケーラビリティが大幅向上", ["ADA"], TopicPriority.HIGH),
            ("Polygon（MATIC）がzk-SNARKsベースの新しいソリューションを発表", ["MATIC"], TopicPriority.HIGH),
            ("Chainlink（LINK）が新しいオラクルサービスを開始、リアルワールドアセット対応", ["LINK"], TopicPriority.MEDIUM),
            ("Avalanche（AVAX）上でのDeFiプロトコル数が1000を突破", ["AVAX"], TopicPriority.MEDIUM),
            
            # DeFi関連
            ("DeFiプロトコルAaveで新しい担保オプションが追加", ["AAVE"], TopicPriority.MEDIUM),
            ("Compound（COMP）がガバナンス提案により新機能を実装", ["COMP"], TopicPriority.MEDIUM),
            ("1inch（1INCH）が新しいDEXアグリゲーター機能をリリース", ["1INCH"], TopicPriority.MEDIUM),
            ("MakerDAO（MKR）がリアルワールドアセット担保の拡大を検討", ["MKR"], TopicPriority.MEDIUM),
            ("SushiSwap（SUSHI）がクロスチェーン機能を強化", ["SUSHI"], TopicPriority.LOW),
            
            # 規制・法律関連
            ("米SEC、仮想通貨取引所規制に関する新しいガイドラインを発表", ["BTC", "ETH"], TopicPriority.HIGH),
            ("日本政府、Web3推進のための新しい税制優遇措置を検討", ["BTC", "ETH"], TopicPriority.HIGH),
            ("EU、MiCA規制の詳細ガイドラインを公開、来年から施行", ["BTC", "ETH"], TopicPriority.MEDIUM),
            ("中国、デジタル人民元のクロスボーダー決済テストを拡大", ["DCEP"], TopicPriority.MEDIUM),
            ("韓国、仮想通貨取引の税制改正案を国会に提出", ["BTC", "ETH"], TopicPriority.MEDIUM),
            
            # テクノロジー関連
            ("量子コンピューターの脅威に対する仮想通貨の対策が議論される", ["BTC", "ETH"], TopicPriority.HIGH),
            ("ライトニングネットワークの容量が5000BTCを突破", ["BTC"], TopicPriority.MEDIUM),
            ("zkプルーフ技術の新しい実装がイーサリアムで成功", ["ETH"], TopicPriority.MEDIUM),
            ("Web3ウォレットの新しいセキュリティ標準が策定", ["BTC", "ETH"], TopicPriority.MEDIUM),
            ("分散型ストレージFilecoin（FIL）が新しいプロトコルアップデートを実行", ["FIL"], TopicPriority.LOW),
            
            # 企業・機関投資家関連
            ("Tesla、第3四半期にビットコインを追加購入していたことが判明", ["BTC"], TopicPriority.HIGH),
            ("PayPal、仮想通貨決済サービスを日本でも開始予定", ["BTC", "ETH"], TopicPriority.HIGH),
            ("Goldman Sachs、仮想通貨取引デスクを拡張", ["BTC", "ETH"], TopicPriority.MEDIUM),
            ("JPモルガン、JPMコインの利用範囲を拡大", ["JPM"], TopicPriority.MEDIUM),
            ("Meta、メタバース向け仮想通貨決済システムを開発中", ["META"], TopicPriority.MEDIUM),
            
            # マーケット分析関連
            ("仮想通貨市場の時価総額が3兆ドルを再び突破", ["BTC", "ETH"], TopicPriority.HIGH),
            ("ビットコインとイーサリアムの相関係数が過去最低を記録", ["BTC", "ETH"], TopicPriority.MEDIUM),
            ("アルトコインシーズンの兆候が現れる、ビットコイン優位性が低下", ["BTC", "ETH"], TopicPriority.MEDIUM),
            ("機関投資家のDeFi参入が加速、AUM総額が1000億ドル突破", ["DeFi"], TopicPriority.MEDIUM),
            ("仮想通貨レンディング市場の成長率が年率300%を記録", ["BTC", "ETH"], TopicPriority.MEDIUM),
            
            # セキュリティ・ハッキング関連
            ("大手DeFiプロトコルで5000万ドル相当のハッキング被害", ["DeFi"], TopicPriority.URGENT),
            ("新しいフィッシング攻撃手法が発見、ユーザーに注意喚起", ["BTC", "ETH"], TopicPriority.HIGH),
            ("マルチシグウォレットの新しいセキュリティ脆弱性が報告", ["BTC", "ETH"], TopicPriority.HIGH),
            ("仮想通貨取引所のコールドストレージ管理基準が更新", ["BTC", "ETH"], TopicPriority.MEDIUM),
            ("ブロックチェーン監査企業が新しい脆弱性検出ツールを発表", ["BTC", "ETH"], TopicPriority.MEDIUM),
            
            # 新技術・イノベーション関連
            ("AIと仮想通貨を組み合わせた新しい投資プラットフォームが登場", ["AI", "BTC"], TopicPriority.MEDIUM),
            ("グリーンビットコインマイニングの新技術が実用化", ["BTC"], TopicPriority.MEDIUM),
            ("ブロックチェーンベースの炭素クレジット取引市場がローンチ", ["CARBON"], TopicPriority.MEDIUM),
            ("仮想通貨とIoTデバイスの統合ソリューションが発表", ["IOT", "BTC"], TopicPriority.LOW),
            ("宇宙空間でのビットコインマイニング実験が開始", ["BTC"], TopicPriority.LOW),
            
            # 追加のトピック（50件以上にするため）
            ("Ripple（XRP）がCBDC技術で中央銀行と新たなパートナーシップ", ["XRP"], TopicPriority.HIGH),
            ("Polkadot（DOT）パラチェーンオークションで新プロジェクトが大量参加", ["DOT"], TopicPriority.MEDIUM),
            ("Cosmos（ATOM）のIBC接続が100チェーンを突破", ["ATOM"], TopicPriority.MEDIUM),
            ("Litecoin（LTC）のMWEB機能が正式にアクティベート", ["LTC"], TopicPriority.MEDIUM),
            ("Dogecoin（DOGE）がTwitterの決済システムに統合される可能性", ["DOGE"], TopicPriority.HIGH),
            ("Binance Coin（BNB）がBSCエコシステム拡張を発表", ["BNB"], TopicPriority.MEDIUM),
            ("TRON（TRX）がUSDTの発行量で新記録を達成", ["TRX"], TopicPriority.MEDIUM),
            ("Algorand（ALGO）が政府系機関との大型契約を締結", ["ALGO"], TopicPriority.HIGH),
            ("VeChain（VET）がサプライチェーン管理で大手小売業と提携", ["VET"], TopicPriority.MEDIUM),
            ("Theta（THETA）がビデオストリーミング業界で新技術を導入", ["THETA"], TopicPriority.MEDIUM),
            ("Hedera（HBAR）がエンタープライズ向けサービスを拡充", ["HBAR"], TopicPriority.MEDIUM),
            ("The Graph（GRT）がWeb3インデックス技術を改善", ["GRT"], TopicPriority.MEDIUM),
            ("Internet Computer（ICP）がスマートコントラクト実行速度で新記録", ["ICP"], TopicPriority.MEDIUM),
            ("Elrond（EGLD）がNFTマーケットプレイス機能を強化", ["EGLD"], TopicPriority.MEDIUM),
            ("Near Protocol（NEAR）がJavaScript開発者向けツールを発表", ["NEAR"], TopicPriority.MEDIUM),
            ("Fantom（FTM）がDeFiエコシステム拡張のため大型ファンドを設立", ["FTM"], TopicPriority.MEDIUM),
            ("Arbitrum（ARB）がLayer2ソリューションの利用者数が急増", ["ARB"], TopicPriority.HIGH),
            ("Optimism（OP）がガバナンストークンの新しい配布方式を導入", ["OP"], TopicPriority.MEDIUM),
            ("Immutable X（IMX）がゲーミングNFT市場で大型パートナーシップ", ["IMX"], TopicPriority.MEDIUM),
            ("ApeCoin（APE）がメタバース関連プロジェクトで新展開", ["APE"], TopicPriority.MEDIUM),
            ("Sandbox（SAND）がバーチャルランド売買で過去最高額を記録", ["SAND"], TopicPriority.MEDIUM),
            ("Decentraland（MANA）でバーチャルファッションショーが開催", ["MANA"], TopicPriority.LOW),
            ("Enjin（ENJ）がNFTゲーミングプラットフォームを大幅アップデート", ["ENJ"], TopicPriority.MEDIUM),
            ("Flow（FLOW）がNBAとのNFTコレクション第2弾を発表", ["FLOW"], TopicPriority.MEDIUM),
            ("Chiliz（CHZ）がスポーツファントークン市場を拡大", ["CHZ"], TopicPriority.LOW),
        ]
        
        # 現在時刻から過去24時間の間でランダムな時刻を生成
        now = datetime.datetime.now()
        
        for i, (title, coins, priority) in enumerate(mock_topics):
            # ランダムな時刻を生成（過去24時間以内）
            hours_ago = random.uniform(0, 24)
            collected_at = now - datetime.timedelta(hours=hours_ago)
            
            # ソースをランダムに選択
            sources = [TopicSource.RSS_FEED, TopicSource.PRICE_API, TopicSource.SOCIAL_MEDIA, TopicSource.NEWS_API]
            source = random.choice(sources)
            
            # ソースURLを生成
            source_urls = {
                TopicSource.RSS_FEED: "https://cointelegraph.com/rss",
                TopicSource.PRICE_API: "https://api.coingecko.com/api/v3/coins",
                TopicSource.SOCIAL_MEDIA: "https://twitter.com/crypto",
                TopicSource.NEWS_API: "https://newsapi.org/crypto"
            }
            
            topic = CollectedTopic(
                title=title,
                source=source,
                source_url=source_urls[source],
                priority=priority,
                coins=coins,
                keywords=[],
                summary=f"{title[:50]}...",
                collected_at=collected_at,
                data={},
                score=0  # スコアは後で計算される
            )
            
            # スコアを計算
            topic.score = self._calculate_score(topic)
            
            self.topics.append(topic)
            self.processed_titles.add(topic.title.lower())
            self.topic_history[topic.title.lower()] = topic.collected_at


def main():
    """メイン実行関数"""
    print("暗号通貨記事トピック収集システムを開始します...")
    
    # 各コレクターを初期化
    rss_collector = RSSFeedCollector()
    price_collector = PriceDataCollector()
    
    # トピックマネージャーを初期化
    manager = TopicManager()
    
    # RSSフィードから収集
    print("\nRSSフィードからトピックを収集中...")
    rss_topics = rss_collector.collect()
    manager.add_topics(rss_topics)
    print(f"RSSから{len(rss_topics)}件のトピックを収集しました")
    
    # 価格データから収集
    print("\n価格データからトピックを収集中...")
    price_topics = price_collector.collect()
    manager.add_topics(price_topics)
    print(f"価格データから{len(price_topics)}件のトピックを収集しました")
    
    # レポートを生成
    print("\n" + "="*50)
    print(manager.generate_topic_report())
    
    # トピックを保存
    manager.save_topics()
    print("\nトピックを collected_topics.json に保存しました")
    
    # 記事生成用のトピックを出力
    print("\n" + "="*50)
    print("記事生成推奨トピック:")
    
    from crypto_article_generator_mvp import ArticleType, ArticleDepth
    
    for i, topic in enumerate(manager.get_top_topics(5), 1):
        print(f"\n{i}. {topic.title}")
        print(f"   優先度: {topic.priority.name}")
        print(f"   スコア: {topic.score:.1f}")
        print(f"   関連コイン: {', '.join(topic.coins)}")
        print(f"   キーワード: {', '.join(topic.keywords)}")
        
        # 記事タイプの推奨
        if topic.source == TopicSource.PRICE_API:
            article_type = ArticleType.PRICE_ANALYSIS
        elif topic.priority == TopicPriority.URGENT:
            article_type = ArticleType.BREAKING_NEWS
        else:
            article_type = ArticleType.MARKET_OVERVIEW
        
        # 深度の推奨
        if topic.priority in [TopicPriority.URGENT, TopicPriority.HIGH]:
            depth = ArticleDepth.MEDIUM
        else:
            depth = ArticleDepth.SHALLOW
        
        print(f"   推奨記事タイプ: {article_type.value}")
        print(f"   推奨深度: {depth.value}")


# エイリアスを作成してcelery_appとの互換性を保つ
TopicCollector = TopicManager

if __name__ == "__main__":
    main()