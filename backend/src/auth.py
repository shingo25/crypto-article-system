"""
API認証ミドルウェア
FastAPIアプリケーションのセキュリティを強化
"""

from fastapi import Security, HTTPException, status, Depends
from fastapi.security import APIKeyHeader
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# 環境変数からAPIキーを取得
API_SECRET_KEY = os.getenv("API_SECRET_KEY")
API_KEY_NAME = "X-API-Key"

# APIキーヘッダーの定義
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def get_api_key(api_key: Optional[str] = Security(api_key_header)) -> str:
    """
    APIキーを検証する依存関数
    
    Args:
        api_key: リクエストヘッダーから取得したAPIキー
        
    Returns:
        検証済みのAPIキー
        
    Raises:
        HTTPException: APIキーが無効または不足している場合
    """
    if not API_SECRET_KEY:
        logger.error("API_SECRET_KEY is not configured in environment variables")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API authentication is not properly configured"
        )
    
    if api_key == API_SECRET_KEY:
        return api_key
    else:
        if not api_key:
            logger.warning("API request without authentication header")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key required",
                headers={"WWW-Authenticate": f"{API_KEY_NAME}"}
            )
        else:
            logger.warning(f"Invalid API key attempt: {api_key[:8]}...")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid API key"
            )

# 認証が不要なエンドポイントのリスト
PUBLIC_ENDPOINTS = [
    "/",
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
]

def is_public_endpoint(path: str) -> bool:
    """
    エンドポイントが公開されているかどうかを確認
    
    Args:
        path: リクエストパス
        
    Returns:
        公開エンドポイントの場合True
    """
    return path in PUBLIC_ENDPOINTS or path.startswith("/docs") or path.startswith("/redoc")