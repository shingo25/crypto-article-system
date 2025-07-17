#!/usr/bin/env python3
"""
WordPress自動投稿システム
生成された記事をWordPressに下書きとして自動投稿
"""

import os
import json
import requests
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
import base64
import logging
from dotenv import load_dotenv

load_dotenv()

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class WordPressPost:
    """WordPress投稿データ"""
    title: str
    content: str
    status: str = 'draft'  # draft, publish, private
    categories: List[int] = None
    tags: List[int] = None
    featured_media: Optional[int] = None
    meta: Dict = None
    excerpt: Optional[str] = None


class WordPressClient:
    """WordPress REST API クライアント"""
    
    def __init__(self):
        self.base_url = os.getenv('WORDPRESS_URL')
        self.username = os.getenv('WORDPRESS_USERNAME')
        self.app_password = os.getenv('WORDPRESS_APP_PASSWORD')
        
        if not all([self.base_url, self.username, self.app_password]):
            raise ValueError("WordPress credentials not found in environment variables")
        
        # REST APIのエンドポイント
        self.api_url = f"{self.base_url.rstrip('/')}/wp-json/wp/v2"
        
        # 認証ヘッダー
        credentials = base64.b64encode(
            f"{self.username}:{self.app_password}".encode()
        ).decode('ascii')
        self.headers = {
            'Authorization': f'Basic {credentials}',
            'Content-Type': 'application/json'
        }
        
        # カテゴリとタグのキャッシュ
        self._categories_cache = None
        self._tags_cache = None
    
    def test_connection(self) -> bool:
        """接続テスト"""
        try:
            response = requests.get(
                f"{self.api_url}/users/me",
                headers=self.headers
            )
            if response.status_code == 200:
                user_data = response.json()
                logger.info(f"Connected as: {user_data['name']}")
                return True
            else:
                logger.error(f"Connection failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Connection error: {e}")
            return False
    
    def create_post(self, post: WordPressPost) -> Optional[int]:
        """投稿を作成"""
        try:
            # 投稿データを準備
            post_data = {
                'title': post.title,
                'content': post.content,
                'status': post.status,
                'excerpt': post.excerpt or ''
            }
            
            # カテゴリとタグを設定
            if post.categories:
                post_data['categories'] = post.categories
            if post.tags:
                post_data['tags'] = post.tags
            
            # メタデータを設定
            if post.meta:
                post_data['meta'] = post.meta
            
            # 投稿を作成
            response = requests.post(
                f"{self.api_url}/posts",
                headers=self.headers,
                json=post_data
            )
            
            if response.status_code == 201:
                created_post = response.json()
                post_id = created_post['id']
                logger.info(f"Post created successfully: ID={post_id}, URL={created_post['link']}")
                return post_id
            else:
                logger.error(f"Failed to create post: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating post: {e}")
            return None
    
    def update_post(self, post_id: int, updates: Dict) -> bool:
        """投稿を更新"""
        try:
            response = requests.post(
                f"{self.api_url}/posts/{post_id}",
                headers=self.headers,
                json=updates
            )
            
            if response.status_code == 200:
                logger.info(f"Post {post_id} updated successfully")
                return True
            else:
                logger.error(f"Failed to update post {post_id}: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating post {post_id}: {e}")
            return False
    
    def get_categories(self) -> List[Dict]:
        """カテゴリ一覧を取得"""
        if self._categories_cache is not None:
            return self._categories_cache
        
        try:
            response = requests.get(
                f"{self.api_url}/categories",
                headers=self.headers,
                params={'per_page': 100}
            )
            
            if response.status_code == 200:
                self._categories_cache = response.json()
                return self._categories_cache
            else:
                logger.error(f"Failed to get categories: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting categories: {e}")
            return []
    
    def get_or_create_category(self, name: str, description: str = "") -> Optional[int]:
        """カテゴリを取得または作成"""
        # 既存のカテゴリを検索
        categories = self.get_categories()
        for cat in categories:
            if cat['name'].lower() == name.lower():
                return cat['id']
        
        # 新しいカテゴリを作成
        try:
            response = requests.post(
                f"{self.api_url}/categories",
                headers=self.headers,
                json={
                    'name': name,
                    'description': description
                }
            )
            
            if response.status_code == 201:
                new_cat = response.json()
                self._categories_cache = None  # キャッシュをクリア
                logger.info(f"Created new category: {name} (ID={new_cat['id']})")
                return new_cat['id']
            else:
                logger.error(f"Failed to create category: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating category: {e}")
            return None
    
    def get_tags(self) -> List[Dict]:
        """タグ一覧を取得"""
        if self._tags_cache is not None:
            return self._tags_cache
        
        try:
            response = requests.get(
                f"{self.api_url}/tags",
                headers=self.headers,
                params={'per_page': 100}
            )
            
            if response.status_code == 200:
                self._tags_cache = response.json()
                return self._tags_cache
            else:
                logger.error(f"Failed to get tags: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting tags: {e}")
            return []
    
    def get_or_create_tag(self, name: str) -> Optional[int]:
        """タグを取得または作成"""
        # 既存のタグを検索
        tags = self.get_tags()
        for tag in tags:
            if tag['name'].lower() == name.lower():
                return tag['id']
        
        # 新しいタグを作成
        try:
            response = requests.post(
                f"{self.api_url}/tags",
                headers=self.headers,
                json={'name': name}
            )
            
            if response.status_code == 201:
                new_tag = response.json()
                self._tags_cache = None  # キャッシュをクリア
                logger.info(f"Created new tag: {name} (ID={new_tag['id']})")
                return new_tag['id']
            else:
                logger.error(f"Failed to create tag: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating tag: {e}")
            return None


class ArticlePublisher:
    """記事をWordPressに投稿"""
    
    def __init__(self):
        self.wp_client = WordPressClient()
        
        # デフォルトカテゴリ
        self.default_categories = {
            'breaking_news': '暗号通貨ニュース',
            'price_analysis': '価格分析',
            'technical_analysis': 'テクニカル分析',
            'project_update': 'プロジェクト情報',
            'educational': '初心者ガイド',
            'market_overview': '市場動向'
        }
    
    def publish_article(self, article_path: str, metadata_path: str) -> Optional[int]:
        """記事を投稿"""
        try:
            # HTMLコンテンツを読み込み
            with open(article_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # メタデータを読み込み
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            # タイトルを生成
            title = metadata['topic']['title']
            
            # カテゴリを設定
            article_type = metadata['article']['type']
            category_name = self.default_categories.get(article_type, '暗号通貨')
            category_id = self.wp_client.get_or_create_category(category_name)
            categories = [category_id] if category_id else []
            
            # タグを設定
            tags = []
            for coin in metadata['article']['coins']:
                tag_id = self.wp_client.get_or_create_tag(coin)
                if tag_id:
                    tags.append(tag_id)
            
            for keyword in metadata['article']['keywords'][:5]:  # 最大5個
                tag_id = self.wp_client.get_or_create_tag(keyword)
                if tag_id:
                    tags.append(tag_id)
            
            # 抜粋を生成
            excerpt = self._generate_excerpt(html_content)
            
            # 投稿データを作成
            post = WordPressPost(
                title=title,
                content=html_content,
                status='draft',
                categories=categories,
                tags=tags,
                excerpt=excerpt,
                meta={
                    'article_generator_version': '1.0',
                    'generated_at': metadata['generated_at'],
                    'topic_score': metadata['topic'].get('score', 0)
                }
            )
            
            # 投稿を作成
            post_id = self.wp_client.create_post(post)
            
            if post_id:
                # 成功時の記録
                self._save_publish_record(article_path, post_id, metadata)
            
            return post_id
            
        except Exception as e:
            logger.error(f"Error publishing article: {e}")
            return None
    
    def _generate_excerpt(self, html_content: str, max_length: int = 150) -> str:
        """HTMLから抜粋を生成"""
        # 簡易的なHTML除去
        import re
        text = re.sub('<[^<]+?>', '', html_content)
        text = text.strip()
        
        if len(text) <= max_length:
            return text
        
        # 文の区切りで切る
        sentences = text.split('。')
        excerpt = ''
        for sentence in sentences:
            if len(excerpt + sentence) <= max_length:
                excerpt += sentence + '。'
            else:
                break
        
        if not excerpt:
            excerpt = text[:max_length] + '...'
        
        return excerpt
    
    def _save_publish_record(self, article_path: str, post_id: int, metadata: Dict):
        """投稿記録を保存"""
        record = {
            'post_id': post_id,
            'article_path': article_path,
            'published_at': datetime.now().isoformat(),
            'metadata': metadata
        }
        
        # 記録ファイルに追記
        record_file = 'published_articles.jsonl'
        with open(record_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(record, ensure_ascii=False) + '\n')
    
    def batch_publish(self, articles_dir: str, limit: int = 10) -> List[int]:
        """複数記事を一括投稿"""
        published_ids = []
        
        # 記事ファイルを探す
        article_files = []
        for filename in os.listdir(articles_dir):
            if filename.endswith('.html') and not filename.endswith('_meta.json'):
                article_path = os.path.join(articles_dir, filename)
                metadata_path = article_path.replace('.html', '_meta.json')
                
                if os.path.exists(metadata_path):
                    article_files.append((article_path, metadata_path))
        
        # 投稿
        for article_path, metadata_path in article_files[:limit]:
            logger.info(f"Publishing: {os.path.basename(article_path)}")
            post_id = self.publish_article(article_path, metadata_path)
            
            if post_id:
                published_ids.append(post_id)
                
                # 投稿済みファイルを移動
                published_dir = os.path.join(articles_dir, 'published')
                os.makedirs(published_dir, exist_ok=True)
                
                import shutil
                shutil.move(article_path, os.path.join(published_dir, os.path.basename(article_path)))
                shutil.move(metadata_path, os.path.join(published_dir, os.path.basename(metadata_path)))
        
        logger.info(f"Published {len(published_ids)} articles")
        return published_ids


def main():
    """テスト実行"""
    # WordPressクライアントの接続テスト
    wp_client = WordPressClient()
    
    print("WordPress接続テスト...")
    if not wp_client.test_connection():
        print("接続に失敗しました。環境変数を確認してください。")
        return
    
    print("\n利用可能なカテゴリ:")
    categories = wp_client.get_categories()
    for cat in categories[:5]:
        print(f"  - {cat['name']} (ID: {cat['id']})")
    
    print("\n利用可能なタグ:")
    tags = wp_client.get_tags()
    for tag in tags[:5]:
        print(f"  - {tag['name']} (ID: {tag['id']})")
    
    # 記事投稿テスト
    publisher = ArticlePublisher()
    
    # outputディレクトリから最新の記事を探す
    articles_dir = './output/articles'
    if os.path.exists(articles_dir):
        files = os.listdir(articles_dir)
        html_files = [f for f in files if f.endswith('.html')]
        
        if html_files:
            latest_file = sorted(html_files)[-1]
            article_path = os.path.join(articles_dir, latest_file)
            metadata_path = article_path.replace('.html', '_meta.json')
            
            if os.path.exists(metadata_path):
                print(f"\n投稿テスト: {latest_file}")
                post_id = publisher.publish_article(article_path, metadata_path)
                
                if post_id:
                    print(f"✓ 投稿成功! Post ID: {post_id}")
                    print(f"  管理画面で確認: {wp_client.base_url}/wp-admin/post.php?post={post_id}&action=edit")
                else:
                    print("✗ 投稿失敗")


if __name__ == "__main__":
    main()