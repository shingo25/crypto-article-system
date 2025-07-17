#!/usr/bin/env python3
"""
中央設定管理モジュール
環境変数とデフォルト値の管理
"""

import os
from typing import Optional, List
from pathlib import Path
from dotenv import load_dotenv

# .envファイルを読み込み
load_dotenv()

class Config:
    """アプリケーション設定"""
    
    # 基本設定
    APP_NAME = "Crypto Article Generation System"
    VERSION = "1.0.0"
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
    
    # JWT認証設定
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # データベース設定
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./crypto_articles.db")
    
    # 外部API設定
    COINGECKO_API_KEY = os.getenv("COINGECKO_API_KEY")
    NEWSAPI_KEY = os.getenv("NEWSAPI_KEY")
    
    # CORS設定
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    
    # セキュリティ設定
    ALLOWED_IPS = os.getenv("ALLOWED_IPS", "").split(",") if os.getenv("ALLOWED_IPS") else []
    SECURE_COOKIES = os.getenv("SECURE_COOKIES", "false").lower() == "true"
    HTTPS_ONLY = os.getenv("HTTPS_ONLY", "false").lower() == "true"
    
    # レート制限設定
    RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    RATE_LIMIT_PER_HOUR = int(os.getenv("RATE_LIMIT_PER_HOUR", "1000"))
    
    # ログ設定
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "crypto_articles.log")
    
    # キャッシュ設定
    TOPIC_CACHE_TTL_MINUTES = int(os.getenv("TOPIC_CACHE_TTL_MINUTES", "5"))
    
    # その他の設定
    MAX_ARTICLE_LENGTH = int(os.getenv("MAX_ARTICLE_LENGTH", "10000"))
    
    @classmethod
    def validate(cls):
        """設定値の検証"""
        errors = []
        
        # JWT秘密鍵の検証
        if not cls.JWT_SECRET_KEY:
            errors.append("JWT_SECRET_KEY is not set")
        elif cls.JWT_SECRET_KEY == "your-super-secret-jwt-key-change-this-in-production":
            errors.append("JWT_SECRET_KEY is using default value - must be changed for production")
        elif len(cls.JWT_SECRET_KEY) < 32:
            errors.append("JWT_SECRET_KEY should be at least 32 characters long")
        
        # 本番環境での追加検証
        if not cls.DEBUG:
            if not cls.SECURE_COOKIES:
                errors.append("SECURE_COOKIES should be enabled in production")
            if not cls.HTTPS_ONLY:
                errors.append("HTTPS_ONLY should be enabled in production")
        
        return errors
    
    @classmethod
    def get_safe_config(cls) -> dict:
        """APIキーなどの機密情報を除いた設定を返す"""
        return {
            "app_name": cls.APP_NAME,
            "version": cls.VERSION,
            "debug": cls.DEBUG,
            "allowed_origins": cls.ALLOWED_ORIGINS,
            "rate_limit_per_minute": cls.RATE_LIMIT_PER_MINUTE,
            "max_article_length": cls.MAX_ARTICLE_LENGTH,
        }

# 設定の検証を実行
config_errors = Config.validate()
if config_errors:
    import logging
    logger = logging.getLogger(__name__)
    for error in config_errors:
        logger.warning(f"Configuration warning: {error}")