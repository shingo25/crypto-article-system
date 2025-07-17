#!/usr/bin/env python3
"""
記事生成パイプライン
トピック収集から記事生成、WordPress投稿までの一連の流れを管理
"""

import os
import json
import time
import schedule
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass
import logging
from dotenv import load_dotenv

# 自作モジュール
from .topic_collector import (
    TopicManager, RSSFeedCollector, PriceDataCollector,
    CollectedTopic, TopicPriority
)
from .crypto_article_generator_mvp import (
    CryptoArticleGenerator, ArticleTopic, ArticleType, 
    ArticleDepth, GeneratedArticle
)

load_dotenv()

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('article_pipeline.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


@dataclass
class PipelineConfig:
    """パイプラインの設定"""
    max_articles_per_day: int = 50
    max_articles_per_hour: int = 10
    min_topic_score: float = 30.0
    collection_interval_minutes: int = 30
    generation_interval_minutes: int = 5
    enable_wordpress_post: bool = False
    enable_fact_check: bool = False
    output_dir: str = "./output"


class ArticleQuota:
    """記事生成数の管理"""
    
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.daily_count = 0
        self.hourly_count = 0
        self.last_reset_date = datetime.now().date()
        self.last_reset_hour = datetime.now().hour
        self.generation_history: List[Dict] = []
    
    def can_generate(self) -> bool:
        """記事を生成できるかチェック"""
        now = datetime.now()
        
        # 日付が変わったらリセット
        if now.date() > self.last_reset_date:
            self.daily_count = 0
            self.last_reset_date = now.date()
        
        # 時間が変わったらリセット
        if now.hour != self.last_reset_hour:
            self.hourly_count = 0
            self.last_reset_hour = now.hour
        
        # クォータチェック
        if self.daily_count >= self.config.max_articles_per_day:
            logger.warning("Daily quota reached")
            return False
        
        if self.hourly_count >= self.config.max_articles_per_hour:
            logger.warning("Hourly quota reached")
            return False
        
        return True
    
    def increment(self, article_info: Dict):
        """生成数をカウント"""
        self.daily_count += 1
        self.hourly_count += 1
        self.generation_history.append({
            'timestamp': datetime.now().isoformat(),
            'article': article_info
        })
    
    def get_stats(self) -> Dict:
        """統計情報を取得"""
        return {
            'daily_count': self.daily_count,
            'hourly_count': self.hourly_count,
            'daily_remaining': self.config.max_articles_per_day - self.daily_count,
            'hourly_remaining': self.config.max_articles_per_hour - self.hourly_count
        }


class ArticlePipeline:
    """記事生成パイプラインのメインクラス"""
    
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.topic_manager = TopicManager()
        self.rss_collector = RSSFeedCollector()
        self.price_collector = PriceDataCollector()
        self.article_generator = CryptoArticleGenerator()
        self.quota = ArticleQuota(config)
        
        # 生成済みトピックの追跡
        self.processed_topics: set = set()
        
        # 出力ディレクトリ作成
        os.makedirs(config.output_dir, exist_ok=True)
        os.makedirs(f"{config.output_dir}/articles", exist_ok=True)
        os.makedirs(f"{config.output_dir}/logs", exist_ok=True)
    
    def collect_topics(self):
        """トピックを収集"""
        logger.info("Starting topic collection...")
        
        try:
            # RSSから収集
            rss_topics = self.rss_collector.collect()
            self.topic_manager.add_topics(rss_topics)
            logger.info(f"Collected {len(rss_topics)} topics from RSS feeds")
            
            # 価格データから収集
            price_topics = self.price_collector.collect()
            self.topic_manager.add_topics(price_topics)
            logger.info(f"Collected {len(price_topics)} topics from price data")
            
            # トピックを保存
            self.topic_manager.save_topics(
                f"{self.config.output_dir}/logs/topics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )
            
        except Exception as e:
            logger.error(f"Error collecting topics: {e}")
    
    def generate_articles(self):
        """記事を生成"""
        if not self.quota.can_generate():
            logger.info("Quota limit reached, skipping generation")
            return
        
        # 高スコアのトピックを取得
        top_topics = self.topic_manager.get_top_topics(
            count=self.config.max_articles_per_hour,
            min_score=self.config.min_topic_score
        )
        
        # 未処理のトピックをフィルタ
        unprocessed_topics = [
            t for t in top_topics 
            if t.title not in self.processed_topics
        ]
        
        if not unprocessed_topics:
            logger.info("No new topics to process")
            return
        
        logger.info(f"Found {len(unprocessed_topics)} unprocessed topics")
        
        for topic in unprocessed_topics:
            if not self.quota.can_generate():
                break
            
            try:
                # CollectedTopicをArticleTopicに変換
                article_topic = self._convert_to_article_topic(topic)
                
                # 記事を生成
                logger.info(f"Generating article for: {topic.title}")
                article = self.article_generator.generate_article(article_topic)
                
                # 記事を保存
                self._save_article(article, topic)
                
                # 処理済みとしてマーク
                self.processed_topics.add(topic.title)
                
                # クォータを更新
                self.quota.increment({
                    'title': topic.title,
                    'type': article_topic.article_type.value,
                    'word_count': article.word_count
                })
                
                logger.info(f"Successfully generated article: {topic.title}")
                
                # レート制限対策
                time.sleep(5)
                
            except Exception as e:
                logger.error(f"Error generating article for '{topic.title}': {e}")
        
        # 統計情報をログ
        stats = self.quota.get_stats()
        logger.info(f"Generation stats: {stats}")
    
    def _convert_to_article_topic(self, topic: CollectedTopic) -> ArticleTopic:
        """CollectedTopicをArticleTopicに変換"""
        
        # 記事タイプを決定
        if topic.source.value == "price_api":
            article_type = ArticleType.PRICE_ANALYSIS
        elif topic.priority == TopicPriority.URGENT:
            article_type = ArticleType.BREAKING_NEWS
        elif "教育" in topic.title or "とは" in topic.title:
            article_type = ArticleType.EDUCATIONAL
        elif "分析" in topic.title or "analysis" in topic.title.lower():
            article_type = ArticleType.TECHNICAL_ANALYSIS
        else:
            article_type = ArticleType.MARKET_OVERVIEW
        
        # 深度を決定
        if topic.priority in [TopicPriority.URGENT, TopicPriority.HIGH]:
            depth = ArticleDepth.MEDIUM
        elif topic.priority == TopicPriority.MEDIUM:
            depth = ArticleDepth.SHALLOW
        else:
            depth = ArticleDepth.SHALLOW
        
        # メインのコインを選択
        main_coin = topic.coins[0] if topic.coins else "CRYPTO"
        coin_name = self._get_coin_name(main_coin)
        
        return ArticleTopic(
            title=topic.title,
            coin_symbol=main_coin,
            coin_name=coin_name,
            article_type=article_type,
            depth=depth,
            keywords=topic.keywords,
            source_data=topic.data
        )
    
    def _get_coin_name(self, symbol: str) -> str:
        """シンボルからコイン名を取得"""
        coin_names = {
            "BTC": "ビットコイン",
            "ETH": "イーサリアム",
            "XRP": "リップル",
            "ADA": "カルダノ",
            "SOL": "ソラナ",
            "DOT": "ポルカドット",
            "LINK": "チェーンリンク",
            "BNB": "バイナンスコイン",
            "MATIC": "ポリゴン",
            "AVAX": "アバランチ"
        }
        return coin_names.get(symbol, symbol)
    
    def _save_article(self, article: GeneratedArticle, topic: CollectedTopic):
        """記事を保存"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = f"{timestamp}_{article.topic.coin_symbol}_{topic.priority.name}"
        
        # 記事本文を保存
        article_path = f"{self.config.output_dir}/articles/{base_name}.html"
        with open(article_path, 'w', encoding='utf-8') as f:
            f.write(article.html_content)
        
        # メタデータを保存
        metadata = {
            'generated_at': article.generated_at.isoformat(),
            'topic': {
                'title': topic.title,
                'source': topic.source.value,
                'priority': topic.priority.value,
                'score': topic.score,
                'collected_at': topic.collected_at.isoformat()
            },
            'article': {
                'type': article.topic.article_type.value,
                'depth': article.topic.depth.value,
                'word_count': article.word_count,
                'coins': article.topic.coins,
                'keywords': article.topic.keywords
            }
        }
        
        metadata_path = f"{self.config.output_dir}/articles/{base_name}_meta.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    def run_once(self):
        """パイプラインを1回実行"""
        logger.info("Running pipeline once...")
        self.collect_topics()
        self.generate_articles()
    
    def run_scheduled(self):
        """スケジュールに従って実行"""
        logger.info("Starting scheduled pipeline...")
        
        # スケジュール設定
        schedule.every(self.config.collection_interval_minutes).minutes.do(self.collect_topics)
        schedule.every(self.config.generation_interval_minutes).minutes.do(self.generate_articles)
        
        # 初回実行
        self.run_once()
        
        # スケジュール実行
        while True:
            schedule.run_pending()
            time.sleep(60)  # 1分ごとにチェック
    
    def generate_daily_report(self) -> str:
        """日次レポートを生成"""
        report = []
        report.append("="*50)
        report.append(f"日次レポート - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("="*50)
        
        # クォータ情報
        stats = self.quota.get_stats()
        report.append(f"\n記事生成状況:")
        report.append(f"  本日の生成数: {stats['daily_count']}/{self.config.max_articles_per_day}")
        report.append(f"  直近1時間の生成数: {stats['hourly_count']}/{self.config.max_articles_per_hour}")
        
        # トピック情報
        report.append(f"\nトピック収集状況:")
        report.append(f"  総トピック数: {len(self.topic_manager.topics)}")
        report.append(f"  処理済みトピック数: {len(self.processed_topics)}")
        report.append(f"  未処理トピック数: {len(self.topic_manager.topics) - len(self.processed_topics)}")
        
        # 生成記事の内訳
        if self.quota.generation_history:
            report.append(f"\n生成記事の内訳:")
            type_count = {}
            for hist in self.quota.generation_history:
                article_type = hist['article'].get('type', 'unknown')
                type_count[article_type] = type_count.get(article_type, 0) + 1
            
            for article_type, count in type_count.items():
                report.append(f"  {article_type}: {count}件")
        
        return '\n'.join(report)


def main():
    """メイン実行関数"""
    # 設定を読み込み
    config = PipelineConfig(
        max_articles_per_day=int(os.getenv('MAX_ARTICLES_PER_DAY', 50)),
        max_articles_per_hour=int(os.getenv('MAX_ARTICLES_PER_HOUR', 10)),
        min_topic_score=float(os.getenv('MIN_TOPIC_SCORE', 30.0)),
        collection_interval_minutes=int(os.getenv('COLLECTION_INTERVAL_MINUTES', 30)),
        generation_interval_minutes=int(os.getenv('GENERATION_INTERVAL_MINUTES', 5)),
        enable_wordpress_post=os.getenv('ENABLE_WORDPRESS_POST', 'false').lower() == 'true',
        output_dir=os.getenv('OUTPUT_DIR', './output')
    )
    
    # パイプラインを初期化
    pipeline = ArticlePipeline(config)
    
    # 実行モードを選択
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--once':
        # 1回だけ実行
        pipeline.run_once()
        print("\n" + pipeline.generate_daily_report())
    else:
        # スケジュール実行
        try:
            pipeline.run_scheduled()
        except KeyboardInterrupt:
            logger.info("Pipeline stopped by user")
            print("\n" + pipeline.generate_daily_report())


if __name__ == "__main__":
    main()