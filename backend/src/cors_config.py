#!/usr/bin/env python3
"""
CORS設定モジュール
開発環境と本番環境で異なるCORS設定を管理
"""

import os
from typing import List
from urllib.parse import urlparse

class CORSConfig:
    """CORS設定クラス"""
    
    @staticmethod
    def get_allowed_origins() -> List[str]:
        """環境に応じた許可オリジンリストを返す"""
        env = os.getenv("ENVIRONMENT", "development")
        
        # 環境変数から設定されている場合は優先
        custom_origins = os.getenv("CORS_ORIGINS", "").strip()
        if custom_origins:
            return [origin.strip() for origin in custom_origins.split(",")]
        
        # 開発環境のデフォルト設定
        if env == "development":
            return [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
                "http://localhost:8000",
                "http://127.0.0.1:8000",
            ]
        
        # 本番環境のデフォルト設定
        elif env == "production":
            # 本番環境では明示的にドメインを指定
            production_domain = os.getenv("PRODUCTION_DOMAIN", "")
            if production_domain:
                # HTTPSを強制
                parsed = urlparse(production_domain)
                if parsed.scheme != "https":
                    production_domain = f"https://{parsed.netloc or production_domain}"
                
                return [
                    production_domain,
                    f"https://www.{parsed.netloc or production_domain}",
                ]
            else:
                # 本番環境でドメインが設定されていない場合は警告
                import logging
                logger = logging.getLogger(__name__)
                logger.warning("PRODUCTION_DOMAIN is not set for production environment")
                return []
        
        # その他の環境（ステージングなど）
        else:
            return ["http://localhost:3000"]
    
    @staticmethod
    def get_cors_config() -> dict:
        """FastAPI CORSMiddleware用の設定を返す"""
        env = os.getenv("ENVIRONMENT", "development")
        
        base_config = {
            "allow_origins": CORSConfig.get_allowed_origins(),
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["*"],
            "expose_headers": ["*"],
        }
        
        # 本番環境ではより厳格な設定
        if env == "production":
            base_config.update({
                # 特定のヘッダーのみ許可
                "allow_headers": [
                    "Accept",
                    "Accept-Language",
                    "Content-Type",
                    "Authorization",
                    "X-API-Key",
                    "X-Request-ID",
                ],
                # 必要なヘッダーのみ公開
                "expose_headers": [
                    "X-Request-ID",
                    "X-Rate-Limit",
                    "X-Rate-Limit-Remaining",
                ],
                # プリフライトリクエストのキャッシュ時間を設定
                "max_age": 3600,
            })
        
        return base_config
    
    @staticmethod
    def validate_origin(origin: str) -> bool:
        """オリジンが許可されているかチェック"""
        allowed_origins = CORSConfig.get_allowed_origins()
        
        # 完全一致チェック
        if origin in allowed_origins:
            return True
        
        # ワイルドカードサポート（開発環境のみ）
        if os.getenv("ENVIRONMENT", "development") == "development":
            for allowed in allowed_origins:
                if allowed == "*":
                    return True
                if allowed.endswith("*") and origin.startswith(allowed[:-1]):
                    return True
        
        return False