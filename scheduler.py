#!/usr/bin/env python3
"""
APScheduler-based automatic topic collection scheduler
RSSフィードからの自動トピック収集スケジューラー
"""

import os
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import httpx
import json

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED

logger = logging.getLogger(__name__)

class TopicCollectionScheduler:
    """
    自動トピック収集スケジューラー
    
    機能:
    - 15分間隔でトピック収集API呼び出し
    - システム開始/停止制御
    - エラーハンドリング
    - 重複実行防止
    - ログ出力
    """
    
    def __init__(self, api_base_url: str = "http://localhost:8000"):
        self.api_base_url = api_base_url
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
        self.last_collection_time: Optional[datetime] = None
        self.collection_count = 0
        self.error_count = 0
        self.is_collecting = False  # 重複実行防止フラグ
        
        # スケジューラーイベントリスナー設定
        self.scheduler.add_listener(
            self._job_executed, 
            EVENT_JOB_EXECUTED
        )
        self.scheduler.add_listener(
            self._job_error, 
            EVENT_JOB_ERROR
        )
        
        logger.info("TopicCollectionScheduler initialized")
    
    async def start(self) -> bool:
        """スケジューラーを開始"""
        try:
            if self.is_running:
                logger.warning("Scheduler is already running")
                return True
            
            # 15分間隔でトピック収集ジョブを追加
            self.scheduler.add_job(
                self._collect_topics_job,
                trigger=IntervalTrigger(minutes=15),
                id='topic_collection',
                name='Automatic Topic Collection',
                replace_existing=True,
                max_instances=1  # 重複実行防止
            )
            
            # スケジューラー開始
            self.scheduler.start()
            self.is_running = True
            
            logger.info("Topic collection scheduler started (15-minute interval)")
            
            # 初回即座に実行
            await self._collect_topics_job()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to start scheduler: {e}")
            return False
    
    async def stop(self) -> bool:
        """スケジューラーを停止"""
        try:
            if not self.is_running:
                logger.warning("Scheduler is not running")
                return True
            
            self.scheduler.shutdown(wait=False)
            self.is_running = False
            
            logger.info("Topic collection scheduler stopped")
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop scheduler: {e}")
            return False
    
    async def restart(self) -> bool:
        """スケジューラーを再起動"""
        try:
            await self.stop()
            await asyncio.sleep(1)  # 短い待機
            return await self.start()
        except Exception as e:
            logger.error(f"Failed to restart scheduler: {e}")
            return False
    
    def get_status(self) -> Dict[str, Any]:
        """スケジューラーの状態を取得"""
        return {
            "is_running": self.is_running,
            "is_collecting": self.is_collecting,
            "last_collection_time": self.last_collection_time.isoformat() if self.last_collection_time else None,
            "collection_count": self.collection_count,
            "error_count": self.error_count,
            "next_run_time": self._get_next_run_time()
        }
    
    def _get_next_run_time(self) -> Optional[str]:
        """次回実行時刻を取得"""
        try:
            if not self.is_running:
                return None
            
            job = self.scheduler.get_job('topic_collection')
            if job and job.next_run_time:
                return job.next_run_time.isoformat()
            return None
        except Exception:
            return None
    
    async def _collect_topics_job(self):
        """
        トピック収集ジョブの実行
        重複実行防止機能付き
        """
        if self.is_collecting:
            logger.warning("Topic collection already in progress, skipping...")
            return
        
        self.is_collecting = True
        start_time = datetime.now()
        
        try:
            logger.info("Starting automatic topic collection...")
            
            # トピック収集API呼び出し
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(f"{self.api_base_url}/api/topics/collect")
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"Topic collection completed successfully: {result.get('message', 'No message')}")
                    
                    # 統計更新
                    self.last_collection_time = start_time
                    self.collection_count += 1
                    
                    # タスクIDがある場合はステータスをチェック
                    task_id = result.get('taskId')
                    if task_id:
                        await self._monitor_collection_task(task_id)
                    
                else:
                    error_msg = f"Topic collection API failed: HTTP {response.status_code}"
                    logger.error(error_msg)
                    self.error_count += 1
                    
        except httpx.TimeoutException:
            logger.error("Topic collection timed out")
            self.error_count += 1
        except httpx.ConnectError:
            logger.error("Cannot connect to API server for topic collection")
            self.error_count += 1
        except Exception as e:
            logger.error(f"Unexpected error during topic collection: {e}")
            self.error_count += 1
        finally:
            self.is_collecting = False
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"Topic collection job completed in {duration:.2f} seconds")
    
    async def _monitor_collection_task(self, task_id: str):
        """
        収集タスクの完了を監視
        """
        try:
            max_wait_time = 120  # 最大2分間待機
            check_interval = 5   # 5秒間隔でチェック
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                for _ in range(max_wait_time // check_interval):
                    try:
                        response = await client.get(f"{self.api_base_url}/api/tasks/{task_id}/status")
                        
                        if response.status_code == 200:
                            task_status = response.json()
                            status = task_status.get('status')
                            
                            if status == 'completed':
                                logger.info(f"Collection task {task_id} completed successfully")
                                break
                            elif status == 'failed':
                                logger.error(f"Collection task {task_id} failed: {task_status.get('error', 'Unknown error')}")
                                break
                            # pending or in_progress の場合は継続
                        
                        await asyncio.sleep(check_interval)
                        
                    except Exception as e:
                        logger.warning(f"Error checking task status: {e}")
                        break
                        
        except Exception as e:
            logger.warning(f"Task monitoring failed: {e}")
    
    def _job_executed(self, event):
        """ジョブ実行完了イベント"""
        logger.debug(f"Job {event.job_id} executed successfully")
    
    def _job_error(self, event):
        """ジョブエラーイベント"""
        logger.error(f"Job {event.job_id} crashed: {event.exception}")
        self.error_count += 1

# グローバルスケジューラーインスタンス
_scheduler_instance: Optional[TopicCollectionScheduler] = None

def get_scheduler() -> TopicCollectionScheduler:
    """シングルトンスケジューラーインスタンスを取得"""
    global _scheduler_instance
    if _scheduler_instance is None:
        api_url = os.getenv('API_BASE_URL', 'http://localhost:8000')
        _scheduler_instance = TopicCollectionScheduler(api_url)
    return _scheduler_instance

async def start_scheduler() -> bool:
    """スケジューラーを開始"""
    scheduler = get_scheduler()
    return await scheduler.start()

async def stop_scheduler() -> bool:
    """スケジューラーを停止"""
    scheduler = get_scheduler()
    return await scheduler.stop()

async def restart_scheduler() -> bool:
    """スケジューラーを再起動"""
    scheduler = get_scheduler()
    return await scheduler.restart()

def get_scheduler_status() -> Dict[str, Any]:
    """スケジューラーの状態を取得"""
    scheduler = get_scheduler()
    return scheduler.get_status()