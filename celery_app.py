"""
Celery configuration and task definitions for asynchronous processing
"""

import os
import logging
from celery import Celery
from celery.utils.log import get_task_logger
from redis import Redis
import json
from datetime import datetime, timedelta
from pathlib import Path

# Import your modules
from src.article_pipeline import ArticlePipeline
from src.topic_collector import TopicCollector
from src.crypto_article_generator_mvp import (
    ArticleType, ArticleDepth, GeneratedArticle
)

# Configure logging
logger = get_task_logger(__name__)
logging.basicConfig(level=logging.INFO)

# Celery configuration
app = Celery('crypto_article_system')
app.config_from_object({
    'broker_url': os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    'result_backend': os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    'task_serializer': 'json',
    'result_serializer': 'json',
    'accept_content': ['json'],
    'timezone': 'Asia/Tokyo',
    'enable_utc': True,
    'task_track_started': True,
    'task_time_limit': 1800,  # 30 minutes
    'task_soft_time_limit': 1500,  # 25 minutes
    'worker_prefetch_multiplier': 1,
    'worker_max_tasks_per_child': 50,
    'task_acks_late': True,
    'task_reject_on_worker_lost': True,
})

# Redis client for status tracking
redis_client = Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))

@app.task(bind=True, name='generate_article_async')
def generate_article_async(self, topic_id: str, article_type: str = 'analysis', 
                          depth: str = 'comprehensive', publish: bool = False):
    """
    非同期で記事を生成するタスク
    """
    try:
        # タスク開始を記録
        task_id = self.request.id
        redis_client.setex(
            f"task:{task_id}:status",
            3600,  # 1時間でキー削除
            json.dumps({
                'status': 'started',
                'topic_id': topic_id,
                'started_at': datetime.now().isoformat(),
                'progress': 0
            })
        )
        
        logger.info(f"Starting article generation for topic {topic_id}")
        
        # ArticlePipelineを初期化
        pipeline = ArticlePipeline()
        
        # 進行状況を更新
        self.update_state(state='PROGRESS', meta={'progress': 10, 'status': 'Initializing pipeline'})
        redis_client.setex(
            f"task:{task_id}:status",
            3600,
            json.dumps({
                'status': 'progress',
                'topic_id': topic_id,
                'progress': 10,
                'message': 'Initializing pipeline'
            })
        )
        
        # トピックを取得
        collector = TopicCollector()
        topics = collector.get_collected_topics(limit=100)
        topic = next((t for t in topics if str(t.id) == topic_id), None)
        
        if not topic:
            raise ValueError(f"Topic {topic_id} not found")
        
        # 進行状況を更新
        self.update_state(state='PROGRESS', meta={'progress': 30, 'status': 'Generating article'})
        redis_client.setex(
            f"task:{task_id}:status",
            3600,
            json.dumps({
                'status': 'progress',
                'topic_id': topic_id,
                'progress': 30,
                'message': 'Generating article'
            })
        )
        
        # 記事を生成
        article_type_enum = ArticleType[article_type.upper()]
        depth_enum = ArticleDepth[depth.upper()]
        
        article = pipeline.generator.generate_article(
            topic=topic,
            article_type=article_type_enum,
            depth=depth_enum
        )
        
        # 進行状況を更新
        self.update_state(state='PROGRESS', meta={'progress': 70, 'status': 'Saving article'})
        redis_client.setex(
            f"task:{task_id}:status",
            3600,
            json.dumps({
                'status': 'progress',
                'topic_id': topic_id,
                'progress': 70,
                'message': 'Saving article'
            })
        )
        
        # 記事を保存
        output_dir = Path("./output/articles")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{topic_id}"
        
        # HTML保存
        with open(output_dir / f"{filename}.html", 'w', encoding='utf-8') as f:
            f.write(article.html_content)
        
        # メタデータ保存
        metadata = {
            "generated_at": article.generated_at.isoformat(),
            "topic": {
                "id": topic_id,
                "title": topic.title,
                "score": topic.score,
                "source": topic.source.value if topic.source else None,
                "source_url": topic.source_url
            },
            "article": {
                "type": article_type,
                "depth": depth,
                "word_count": article.word_count,
                "coins": article.coins,
                "keywords": article.keywords
            },
            "task_id": task_id
        }
        
        with open(output_dir / f"{filename}_meta.json", 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        # WordPressへの投稿（必要な場合）
        if publish:
            self.update_state(state='PROGRESS', meta={'progress': 90, 'status': 'Publishing to WordPress'})
            redis_client.setex(
                f"task:{task_id}:status",
                3600,
                json.dumps({
                    'status': 'progress',
                    'topic_id': topic_id,
                    'progress': 90,
                    'message': 'Publishing to WordPress'
                })
            )
            
            try:
                post_id = pipeline.publisher.publish_article(article, status='draft')
                metadata['wordpress_post_id'] = post_id
                
                # メタデータを更新
                with open(output_dir / f"{filename}_meta.json", 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, ensure_ascii=False, indent=2)
            except Exception as e:
                logger.warning(f"Failed to publish to WordPress: {e}")
        
        # 完了を記録
        redis_client.setex(
            f"task:{task_id}:status",
            3600,
            json.dumps({
                'status': 'completed',
                'topic_id': topic_id,
                'progress': 100,
                'article_id': filename,
                'completed_at': datetime.now().isoformat()
            })
        )
        
        return {
            'success': True,
            'article_id': filename,
            'word_count': article.word_count,
            'task_id': task_id
        }
        
    except Exception as e:
        logger.error(f"Error generating article: {e}")
        
        # エラーを記録
        redis_client.setex(
            f"task:{self.request.id}:status",
            3600,
            json.dumps({
                'status': 'failed',
                'topic_id': topic_id,
                'error': str(e),
                'failed_at': datetime.now().isoformat()
            })
        )
        
        raise

@app.task(bind=True, name='collect_topics_async')
def collect_topics_async(self):
    """
    非同期でトピックを収集するタスク
    """
    try:
        task_id = self.request.id
        
        # タスク開始を記録
        redis_client.setex(
            f"task:{task_id}:status",
            3600,
            json.dumps({
                'status': 'started',
                'started_at': datetime.now().isoformat(),
                'progress': 0
            })
        )
        
        logger.info("Starting topic collection")
        
        # TopicCollectorを初期化
        collector = TopicCollector()
        
        # 進行状況を更新
        self.update_state(state='PROGRESS', meta={'progress': 50, 'status': 'Collecting topics'})
        
        # トピックを収集
        collected_count = collector.collect_all()
        
        # 完了を記録
        redis_client.setex(
            f"task:{task_id}:status",
            3600,
            json.dumps({
                'status': 'completed',
                'progress': 100,
                'collected_count': collected_count,
                'completed_at': datetime.now().isoformat()
            })
        )
        
        return {
            'success': True,
            'collected_count': collected_count,
            'task_id': task_id
        }
        
    except Exception as e:
        logger.error(f"Error collecting topics: {e}")
        
        # エラーを記録
        redis_client.setex(
            f"task:{self.request.id}:status",
            3600,
            json.dumps({
                'status': 'failed',
                'error': str(e),
                'failed_at': datetime.now().isoformat()
            })
        )
        
        raise

@app.task(name='cleanup_old_tasks')
def cleanup_old_tasks():
    """
    古いタスクステータスをクリーンアップ
    """
    try:
        # 1時間以上前のタスクステータスを削除
        pattern = "task:*:status"
        for key in redis_client.scan_iter(match=pattern):
            data = redis_client.get(key)
            if data:
                status = json.loads(data)
                if 'started_at' in status:
                    started_at = datetime.fromisoformat(status['started_at'])
                    if datetime.now() - started_at > timedelta(hours=1):
                        redis_client.delete(key)
                        logger.info(f"Cleaned up old task status: {key}")
        
        return {'success': True, 'message': 'Cleanup completed'}
        
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        return {'success': False, 'error': str(e)}

# Celeryのビートスケジュール設定
app.conf.beat_schedule = {
    'cleanup-old-tasks': {
        'task': 'cleanup_old_tasks',
        'schedule': 3600.0,  # 1時間ごと
    },
}

if __name__ == '__main__':
    app.start()