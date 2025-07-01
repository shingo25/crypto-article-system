#!/usr/bin/env python3
"""
既存のJSONファイルデータをPostgreSQLにインポートするスクリプト
"""

import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path

# プロジェクトルートをパスに追加
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from src.database import (
    SessionLocal, Topic, Article, FactCheckResult, 
    create_tables, DatabaseUtils
)

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DataImporter:
    """JSONデータのインポートクラス"""
    
    def __init__(self):
        self.db = SessionLocal()
        self.imported_topics = 0
        self.imported_articles = 0
        self.skipped_items = 0
        
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.db.close()
    
    def import_topics_from_json(self, json_file_path: str):
        """トピックをJSONファイルからインポート"""
        try:
            if not os.path.exists(json_file_path):
                logger.warning(f"Topics file not found: {json_file_path}")
                return
            
            with open(json_file_path, 'r', encoding='utf-8') as f:
                topics_data = json.load(f)
            
            logger.info(f"Importing {len(topics_data)} topics from {json_file_path}")
            
            for topic_data in topics_data:
                try:
                    # 既存チェック
                    existing = self.db.query(Topic).filter(
                        Topic.title == topic_data.get('title', '')
                    ).first()
                    
                    if existing:
                        logger.debug(f"Topic already exists: {topic_data.get('title', '')}")
                        self.skipped_items += 1
                        continue
                    
                    # 新しいトピックを作成
                    topic = Topic(
                        title=topic_data.get('title', ''),
                        content=topic_data.get('content', ''),
                        score=float(topic_data.get('score', 0.0)),
                        priority=topic_data.get('priority', 'medium'),
                        source=topic_data.get('source', ''),
                        source_url=topic_data.get('source_url', ''),
                        keywords=topic_data.get('keywords', []),
                        coins=topic_data.get('coins', []),
                        collected_at=self._parse_datetime(topic_data.get('collected_at')),
                        processed=topic_data.get('processed', False),
                        processed_at=self._parse_datetime(topic_data.get('processed_at'))
                    )
                    
                    self.db.add(topic)
                    self.imported_topics += 1
                    
                except Exception as e:
                    logger.error(f"Error importing topic: {e}")
                    continue
            
            self.db.commit()
            logger.info(f"Successfully imported {self.imported_topics} topics")
            
        except Exception as e:
            logger.error(f"Error importing topics from {json_file_path}: {e}")
            self.db.rollback()
    
    def import_articles_from_directory(self, articles_dir: str):
        """記事ディレクトリからHTMLとメタデータをインポート"""
        try:
            if not os.path.exists(articles_dir):
                logger.warning(f"Articles directory not found: {articles_dir}")
                return
            
            html_files = [f for f in os.listdir(articles_dir) if f.endswith('.html')]
            logger.info(f"Found {len(html_files)} HTML files in {articles_dir}")
            
            for html_file in html_files:
                try:
                    article_id = html_file.replace('.html', '')
                    meta_file = f"{article_id}_meta.json"
                    
                    html_path = os.path.join(articles_dir, html_file)
                    meta_path = os.path.join(articles_dir, meta_file)
                    
                    # HTMLコンテンツを読み込み
                    with open(html_path, 'r', encoding='utf-8') as f:
                        html_content = f.read()
                    
                    # メタデータを読み込み
                    metadata = {}
                    if os.path.exists(meta_path):
                        with open(meta_path, 'r', encoding='utf-8') as f:
                            metadata = json.load(f)
                    
                    # 既存チェック
                    existing = self.db.query(Article).filter(
                        Article.title == metadata.get('topic', {}).get('title', article_id)
                    ).first()
                    
                    if existing:
                        logger.debug(f"Article already exists: {article_id}")
                        self.skipped_items += 1
                        continue
                    
                    # HTMLからテキストコンテンツを抽出
                    text_content = self._extract_text_from_html(html_content)
                    
                    # 関連トピックを検索
                    topic_title = metadata.get('topic', {}).get('title', '')
                    topic = None
                    if topic_title:
                        topic = self.db.query(Topic).filter(
                            Topic.title == topic_title
                        ).first()
                    
                    # 新しい記事を作成
                    article = Article(
                        topic_id=topic.id if topic else None,
                        title=metadata.get('topic', {}).get('title', article_id),
                        content=text_content,
                        html_content=html_content,
                        type=metadata.get('article', {}).get('type', 'analysis'),
                        status='draft',  # デフォルトは下書き
                        word_count=metadata.get('article', {}).get('word_count', len(text_content)),
                        coins=metadata.get('article', {}).get('coins', []),
                        keywords=metadata.get('article', {}).get('keywords', []),
                        source=metadata.get('topic', {}).get('source'),
                        source_url=metadata.get('topic', {}).get('source_url'),
                        model_used=metadata.get('generation', {}).get('model', 'unknown'),
                        generation_params=metadata.get('generation', {}),
                        generated_at=self._parse_datetime(metadata.get('generated_at'))
                    )
                    
                    self.db.add(article)
                    self.imported_articles += 1
                    
                except Exception as e:
                    logger.error(f"Error importing article {html_file}: {e}")
                    continue
            
            self.db.commit()
            logger.info(f"Successfully imported {self.imported_articles} articles")
            
        except Exception as e:
            logger.error(f"Error importing articles from {articles_dir}: {e}")
            self.db.rollback()
    
    def _parse_datetime(self, date_str):
        """日付文字列をdatetimeオブジェクトに変換"""
        if not date_str:
            return None
        
        try:
            # ISO形式
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except:
            try:
                # 一般的な形式
                return datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
            except:
                logger.warning(f"Cannot parse datetime: {date_str}")
                return None
    
    def _extract_text_from_html(self, html_content: str) -> str:
        """HTMLからテキストコンテンツを抽出"""
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            return soup.get_text().strip()
        except ImportError:
            # BeautifulSoupが利用できない場合は簡易的に処理
            import re
            text = re.sub(r'<[^>]+>', '', html_content)
            return text.strip()
    
    def print_summary(self):
        """インポート結果のサマリーを表示"""
        logger.info("=== Import Summary ===")
        logger.info(f"Topics imported: {self.imported_topics}")
        logger.info(f"Articles imported: {self.imported_articles}")
        logger.info(f"Items skipped: {self.skipped_items}")
        logger.info("=====================")


def main():
    """メイン実行関数"""
    logger.info("Starting JSON to PostgreSQL import process...")
    
    # データベーステーブルを作成
    logger.info("Creating database tables...")
    create_tables()
    
    # データベース接続テスト
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        logger.error("Please ensure PostgreSQL is running and DATABASE_URL is correctly set")
        return
    
    with DataImporter() as importer:
        # トピックデータをインポート
        topics_file = os.path.join(project_root, "output", "topics.json")
        if os.path.exists(topics_file):
            importer.import_topics_from_json(topics_file)
        else:
            logger.info("No topics.json file found, skipping topics import")
        
        # 記事データをインポート
        articles_dir = os.path.join(project_root, "output", "articles")
        if os.path.exists(articles_dir):
            importer.import_articles_from_directory(articles_dir)
        else:
            logger.info("No articles directory found, skipping articles import")
        
        # サマリーを表示
        importer.print_summary()
    
    # 最終統計を表示
    logger.info("Getting final database statistics...")
    db = SessionLocal()
    try:
        stats = DatabaseUtils.get_system_stats(db)
        logger.info(f"Total topics in database: {stats['total_topics']}")
        logger.info(f"Total articles in database: {stats['total_articles']}")
        logger.info(f"Published articles: {stats['published_articles']}")
        logger.info(f"Draft articles: {stats['draft_articles']}")
    finally:
        db.close()
    
    logger.info("Import process completed!")


if __name__ == "__main__":
    main()