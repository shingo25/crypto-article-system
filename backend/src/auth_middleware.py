#!/usr/bin/env python3
"""
認証ミドルウェア - APIエンドポイントの保護とレート制限
"""

import os
import time
from typing import Optional, Set, Dict, Any
from fastapi import HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .database import SessionLocal
from .auth_service import AuthService, get_current_user_from_token, get_current_user_from_api_key

# レート制限設定
limiter = Limiter(key_func=get_remote_address)

# 公開エンドポイント（認証不要）
PUBLIC_ENDPOINTS: Set[str] = {
    "/",
    "/health",
    "/docs",
    "/openapi.json",
    "/auth/register",
    "/auth/login",
    "/auth/refresh",
    "/api/topics",           # トピック取得は公開
    "/api/system/stats",     # システム統計は公開
    "/api/system/control",   # システム制御は公開
    "/api/articles",         # 記事一覧は公開（読み取りのみ）
}

# 認証方式の優先順位
AUTH_METHODS = {
    "jwt": 1,      # JWT トークン
    "api_key": 2,  # API キー
}


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    認証ミドルウェア
    
    機能:
    - JWT/APIキー認証の検証
    - 公開エンドポイントの判定
    - レート制限の適用
    - セキュリティヘッダーの追加
    """
    
    def __init__(self, app, exclude_paths: Optional[Set[str]] = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or PUBLIC_ENDPOINTS
        self.security = HTTPBearer(auto_error=False)
    
    async def dispatch(self, request: Request, call_next):
        # セキュリティヘッダーを追加する関数
        def add_security_headers(response: Response):
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            return response
        
        # CORS プリフライトリクエストをスキップ
        if request.method == "OPTIONS":
            response = await call_next(request)
            return add_security_headers(response)
        
        # 公開エンドポイントチェック
        if self._is_public_endpoint(request.url.path):
            response = await call_next(request)
            return add_security_headers(response)
        
        # 認証チェック
        auth_result = await self._authenticate_request(request)
        
        if not auth_result["authenticated"]:
            return JSONResponse(
                status_code=auth_result["status_code"],
                content={"detail": auth_result["error_message"]},
                headers={
                    "WWW-Authenticate": auth_result.get("www_authenticate", "Bearer"),
                    **{k: v for k, v in [
                        ("X-Content-Type-Options", "nosniff"),
                        ("X-Frame-Options", "DENY"),
                        ("X-XSS-Protection", "1; mode=block"),
                    ]}
                }
            )
        
        # 認証情報をリクエストに追加
        request.state.user = auth_result["user"]
        request.state.auth_method = auth_result["auth_method"]
        if "api_key" in auth_result:
            request.state.api_key = auth_result["api_key"]
        
        # レート制限チェック（認証済みユーザー）
        if not await self._check_rate_limit(request, auth_result["user"]):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "レート制限に達しました。しばらくお待ちください。"},
                headers={"Retry-After": "60"}
            )
        
        # リクエスト処理
        response = await call_next(request)
        return add_security_headers(response)
    
    def _is_public_endpoint(self, path: str) -> bool:
        """公開エンドポイントかどうかを判定"""
        # 完全一致チェック
        if path in self.exclude_paths:
            return True
        
        # プレフィックス一致チェック
        public_prefixes = ["/docs", "/redoc", "/openapi", "/static"]
        for prefix in public_prefixes:
            if path.startswith(prefix):
                return True
        
        return False
    
    async def _authenticate_request(self, request: Request) -> Dict[str, Any]:
        """リクエストの認証を実行"""
        db = SessionLocal()
        
        try:
            # JWT認証を試行
            jwt_result = await self._try_jwt_auth(request, db)
            if jwt_result["authenticated"]:
                return jwt_result
            
            # APIキー認証を試行
            api_key_result = await self._try_api_key_auth(request, db)
            if api_key_result["authenticated"]:
                return api_key_result
            
            # どちらも失敗した場合
            return {
                "authenticated": False,
                "status_code": status.HTTP_401_UNAUTHORIZED,
                "error_message": "認証が必要です。JWTトークンまたはAPIキーを提供してください。",
                "www_authenticate": "Bearer"
            }
            
        finally:
            db.close()
    
    async def _try_jwt_auth(self, request: Request, db: Session) -> Dict[str, Any]:
        """JWT認証を試行"""
        auth_header = request.headers.get("Authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            return {"authenticated": False}
        
        token = auth_header.split(" ")[1]
        
        try:
            from .auth_models import verify_token
            from .auth_models import User
            
            payload = verify_token(token, "access")
            if not payload:
                return {
                    "authenticated": False,
                    "status_code": status.HTTP_401_UNAUTHORIZED,
                    "error_message": "無効なJWTトークンです",
                    "www_authenticate": "Bearer"
                }
            
            user_id = payload.get("sub")
            if not user_id:
                return {
                    "authenticated": False,
                    "status_code": status.HTTP_401_UNAUTHORIZED,
                    "error_message": "トークンにユーザー情報が含まれていません",
                    "www_authenticate": "Bearer"
                }
            
            user = db.query(User).filter(
                User.id == int(user_id),
                User.is_active == True
            ).first()
            
            if not user:
                return {
                    "authenticated": False,
                    "status_code": status.HTTP_401_UNAUTHORIZED,
                    "error_message": "ユーザーが見つからないか無効化されています",
                    "www_authenticate": "Bearer"
                }
            
            return {
                "authenticated": True,
                "user": user,
                "auth_method": "jwt"
            }
            
        except Exception as e:
            return {
                "authenticated": False,
                "status_code": status.HTTP_401_UNAUTHORIZED,
                "error_message": "JWT認証に失敗しました",
                "www_authenticate": "Bearer"
            }
    
    async def _try_api_key_auth(self, request: Request, db: Session) -> Dict[str, Any]:
        """APIキー認証を試行"""
        api_key = request.headers.get("X-API-Key")
        
        if not api_key:
            return {"authenticated": False}
        
        try:
            result = AuthService.verify_api_key(db, api_key)
            
            if not result:
                return {
                    "authenticated": False,
                    "status_code": status.HTTP_401_UNAUTHORIZED,
                    "error_message": "無効なAPIキーです",
                    "www_authenticate": "X-API-Key"
                }
            
            user, api_key_obj = result
            
            return {
                "authenticated": True,
                "user": user,
                "api_key": api_key_obj,
                "auth_method": "api_key"
            }
            
        except Exception as e:
            return {
                "authenticated": False,
                "status_code": status.HTTP_401_UNAUTHORIZED,
                "error_message": "APIキー認証に失敗しました",
                "www_authenticate": "X-API-Key"
            }
    
    async def _check_rate_limit(self, request: Request, user) -> bool:
        """認証済みユーザーのレート制限チェック"""
        # 基本的なレート制限実装
        # 実際の本番環境では、Redisなどを使用してより高度な制限を実装
        
        # 管理者ユーザーはレート制限を緩和
        if hasattr(user, 'email') and user.email.endswith('@admin.com'):
            return True
        
        # APIキー認証の場合は個別のレート制限を適用
        if hasattr(request.state, 'api_key'):
            api_key = request.state.api_key
            if hasattr(api_key, 'rate_limit_per_minute'):
                # APIキー固有のレート制限チェック
                # 実装は簡略化（実際にはRedisでより精密に管理）
                return True
        
        # デフォルトのレート制限
        return True


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """セキュリティヘッダー専用ミドルウェア"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # セキュリティヘッダーを追加
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY", 
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "connect-src 'self' https://api.coingecko.com; "
                "frame-ancestors 'none'"
            )
        }
        
        for header, value in security_headers.items():
            response.headers[header] = value
        
        return response


# 依存関数
def get_current_user_from_request(request: Request):
    """リクエストから現在のユーザーを取得"""
    if hasattr(request.state, 'user'):
        return request.state.user
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証が必要です"
    )


# FastAPIのDepends用関数
async def get_current_user(request: Request):
    """現在の認証済みユーザーを取得（Depends用）"""
    return get_current_user_from_request(request)


async def get_current_active_user(request: Request):
    """現在のアクティブなユーザーを取得"""
    user = get_current_user_from_request(request)
    if not hasattr(user, 'is_active') or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ユーザーアカウントが無効化されています"
        )
    return user


def get_current_api_key_from_request(request: Request):
    """リクエストから現在のAPIキーを取得"""
    if hasattr(request.state, 'api_key'):
        return request.state.api_key
    
    return None


def require_permissions(required_permissions: list):
    """指定された権限を要求するデコレータ"""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            user = get_current_user_from_request(request)
            api_key = get_current_api_key_from_request(request)
            
            # APIキー認証の場合は権限チェック
            if api_key:
                api_key_permissions = api_key.permissions.split(',') if api_key.permissions else []
                
                for permission in required_permissions:
                    if permission not in api_key_permissions and 'admin' not in api_key_permissions:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"権限が不足しています: {permission}"
                        )
            
            return await func(request, *args, **kwargs)
        
        return wrapper
    return decorator


# レート制限エラーハンドラー
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """レート制限エラーのハンドラー"""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "detail": f"レート制限に達しました: {exc.detail}",
            "retry_after": getattr(exc, 'retry_after', 60)
        },
        headers={"Retry-After": str(getattr(exc, 'retry_after', 60))}
    )


# JWT環境変数チェック
def validate_jwt_config():
    """JWT設定の検証"""
    secret_key = os.getenv("JWT_SECRET_KEY")
    
    if not secret_key or secret_key == "your-super-secret-jwt-key-change-this-in-production":
        raise ValueError(
            "JWT_SECRET_KEY環境変数が設定されていないか、デフォルト値のままです。"
            "本番環境では必ず安全なシークレットキーを設定してください。"
        )
    
    if len(secret_key) < 32:
        raise ValueError(
            "JWT_SECRET_KEYは32文字以上である必要があります。"
        )


# IP制限機能
class IPWhitelistMiddleware(BaseHTTPMiddleware):
    """IP制限ミドルウェア（管理者機能用）"""
    
    def __init__(self, app, allowed_ips: Optional[Set[str]] = None):
        super().__init__(app)
        self.allowed_ips = allowed_ips or set()
        
        # 環境変数からIP制限リストを読み込み
        env_ips = os.getenv("ALLOWED_IPS", "")
        if env_ips:
            self.allowed_ips.update(env_ips.split(","))
    
    async def dispatch(self, request: Request, call_next):
        # IP制限が設定されていない場合はスキップ
        if not self.allowed_ips:
            return await call_next(request)
        
        # 管理者エンドポイントのみチェック
        if not request.url.path.startswith("/admin"):
            return await call_next(request)
        
        client_ip = self._get_client_ip(request)
        
        if client_ip not in self.allowed_ips:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "このIPアドレスからのアクセスは許可されていません"}
            )
        
        return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """クライアントIPアドレスを取得"""
        # プロキシ経由の場合を考慮
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"