#!/usr/bin/env python3
"""
データベース設定とSQLAlchemyモデル定義
"""

import os
from datetime import datetime
from typing import Optional, List
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

# データベース接続設定
DATABASE_URL = os.getenv(
    'DATABASE_URL', 
    'sqlite:///crypto_articles.db'
)

# SQLAlchemyエンジンとセッション
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """データベースセッションを取得"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# テーブル定義
class Topic(Base):
    """トピックテーブル"""
    __tablename__ = "topics"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    content = Column(Text)
    score = Column(Float, default=0.0)
    priority = Column(String(50), default='medium')
    
    # メタデータ
    source = Column(String(100))  # RSS, API, WEB等
    source_url = Column(Text)
    keywords = Column(JSON)  # 関連キーワード
    coins = Column(JSON)  # 関連暗号通貨
    
    # タイムスタンプ
    collected_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 処理状況
    processed = Column(Boolean, default=False)
    processed_at = Column(DateTime)
    
    # リレーション
    articles = relationship("Article", back_populates="topic")
    
    def __repr__(self):
        return f"<Topic(id={self.id}, title='{self.title}', score={self.score})>"


class Article(Base):
    """記事テーブル"""
    __tablename__ = "articles"
    
    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    
    # 基本情報
    title = Column(String(500), nullable=False, index=True)
    content = Column(Text)
    html_content = Column(Text)
    summary = Column(Text)
    
    # 分類
    type = Column(String(50), default='analysis')  # analysis, news, market_overview, etc.
    status = Column(String(50), default='draft')  # draft, published, archived
    
    # メタデータ
    word_count = Column(Integer, default=0)
    coins = Column(JSON)  # 関連暗号通貨
    keywords = Column(JSON)  # 関連キーワード
    
    # 引用元情報
    source = Column(String(200))
    source_url = Column(Text)
    
    # AI生成情報
    model_used = Column(String(100))  # 使用したAIモデル
    generation_params = Column(JSON)  # 生成パラメータ
    
    # タイムスタンプ
    generated_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # リレーション
    topic = relationship("Topic", back_populates="articles")
    fact_check_results = relationship("FactCheckResult", back_populates="article")
    
    def __repr__(self):
        return f"<Article(id={self.id}, title='{self.title}', type='{self.type}')>"


class FactCheckResult(Base):
    """ファクトチェック結果テーブル"""
    __tablename__ = "fact_check_results"
    
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=False)
    
    # スコア
    reliability_score = Column(Integer, default=0)  # 信頼度スコア (0-100)
    total_facts = Column(Integer, default=0)
    verified_facts = Column(Integer, default=0)
    failed_facts = Column(Integer, default=0)
    skipped_facts = Column(Integer, default=0)
    
    # 詳細結果（JSON形式）
    results = Column(JSON)  # 詳細なファクトチェック結果
    
    # メタデータ
    checker_version = Column(String(50))  # ファクトチェッカーのバージョン
    
    # タイムスタンプ
    checked_at = Column(DateTime, default=datetime.utcnow)
    
    # リレーション
    article = relationship("Article", back_populates="fact_check_results")
    
    def __repr__(self):
        return f"<FactCheckResult(id={self.id}, article_id={self.article_id}, score={self.reliability_score})>"


class GenerationTask(Base):
    """記事生成タスクテーブル（Celeryタスク管理）"""
    __tablename__ = "generation_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(255), unique=True, index=True)  # Celery Task ID
    
    # タスク情報
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=True)
    
    task_type = Column(String(50), nullable=False)  # article_generation, topic_collection, fact_check
    status = Column(String(50), default='pending')  # pending, in_progress, completed, failed
    
    # パラメータ
    parameters = Column(JSON)  # タスクのパラメータ
    
    # 結果
    result = Column(JSON)  # タスクの結果
    error_message = Column(Text)  # エラーメッセージ
    
    # 進捗
    progress = Column(Integer, default=0)  # 進捗率 (0-100)
    
    # タイムスタンプ
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    def __repr__(self):
        return f"<GenerationTask(id={self.id}, task_id='{self.task_id}', status='{self.status}')>"


class SystemMetrics(Base):
    """システムメトリクステーブル"""
    __tablename__ = "system_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # メトリクス名と値
    metric_name = Column(String(100), nullable=False, index=True)
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String(50))  # count, percent, seconds, etc.
    
    # カテゴリとタグ
    category = Column(String(50))  # system, article, topic, performance
    tags = Column(JSON)  # 追加のメタデータ
    
    # タイムスタンプ
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<SystemMetrics(metric_name='{self.metric_name}', value={self.metric_value})>"


class ArticleTemplate(Base):
    """記事テンプレートテーブル"""
    __tablename__ = "article_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 基本情報
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    category = Column(String(100), nullable=False)  # market_analysis, coin_review, technical_analysis, etc.
    
    # テンプレート設定
    article_type = Column(String(50), default='analysis')
    tone = Column(String(50), default='professional')  # professional, casual, technical
    target_length = Column(Integer, default=1000)  # 目標文字数
    
    # 構成設定
    structure = Column(JSON)  # 記事の構成（見出し、セクション等）
    required_elements = Column(JSON)  # 必須要素（価格チャート、技術指標等）
    keywords_template = Column(JSON)  # デフォルトキーワード
    
    # プロンプト設定
    system_prompt = Column(Text)  # AIへのシステムプロンプト
    user_prompt_template = Column(Text)  # ユーザープロンプトのテンプレート
    
    # SEO設定
    seo_title_template = Column(String(500))  # SEOタイトルのテンプレート
    meta_description_template = Column(String(500))  # メタディスクリプションのテンプレート
    
    # 使用状況
    usage_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=True)  # 他のユーザーも使用可能か
    
    # タイムスタンプ
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<ArticleTemplate(id={self.id}, name='{self.name}', category='{self.category}')>"


# データベース初期化関数
def create_tables():
    """テーブルを作成"""
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """テーブルを削除（開発用）"""
    Base.metadata.drop_all(bind=engine)


# データベースユーティリティ関数
class DatabaseUtils:
    """データベース操作のユーティリティクラス"""
    
    @staticmethod
    def get_topic_by_id(db, topic_id: int) -> Optional[Topic]:
        """IDでトピックを取得"""
        return db.query(Topic).filter(Topic.id == topic_id).first()
    
    @staticmethod
    def get_article_by_id(db, article_id: int) -> Optional[Article]:
        """IDで記事を取得"""
        return db.query(Article).filter(Article.id == article_id).first()
    
    @staticmethod
    def get_articles_by_status(db, status: str, limit: int = 20) -> List[Article]:
        """ステータスで記事を検索"""
        return db.query(Article).filter(Article.status == status).limit(limit).all()
    
    @staticmethod
    def get_recent_articles(db, limit: int = 20) -> List[Article]:
        """最新の記事を取得"""
        return db.query(Article).order_by(Article.generated_at.desc()).limit(limit).all()
    
    @staticmethod
    def get_topics_by_score(db, min_score: float = 0.0, limit: int = 20) -> List[Topic]:
        """スコアでトピックを検索"""
        return db.query(Topic).filter(Topic.score >= min_score).order_by(Topic.score.desc()).limit(limit).all()
    
    @staticmethod
    def get_unprocessed_topics(db, limit: int = 10) -> List[Topic]:
        """未処理のトピックを取得"""
        return db.query(Topic).filter(Topic.processed == False).order_by(Topic.score.desc()).limit(limit).all()
    
    @staticmethod
    def search_articles(db, query: str, limit: int = 20) -> List[Article]:
        """記事をタイトルと内容で検索"""
        search_pattern = f"%{query}%"
        return db.query(Article).filter(
            (Article.title.ilike(search_pattern)) |
            (Article.content.ilike(search_pattern))
        ).limit(limit).all()
    
    @staticmethod
    def get_system_stats(db) -> dict:
        """システム統計を取得"""
        stats = {
            'total_topics': db.query(Topic).count(),
            'total_articles': db.query(Article).count(),
            'published_articles': db.query(Article).filter(Article.status == 'published').count(),
            'draft_articles': db.query(Article).filter(Article.status == 'draft').count(),
            'unprocessed_topics': db.query(Topic).filter(Topic.processed == False).count(),
        }
        return stats


if __name__ == "__main__":
    # テーブル作成（開発用）
    print("Creating database tables...")
    create_tables()
    print("Database tables created successfully!")