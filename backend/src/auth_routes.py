#!/usr/bin/env python3
"""
認証関連のAPIエンドポイント
ユーザー登録、ログイン、APIキー管理のための安全なルート
"""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

from .database import get_db
from .auth_models import User, APIKey, RefreshToken, LoginSession
from .auth_service import (
    AuthService, require_authentication, require_api_key_auth,
    get_current_user_from_token, limiter
)
from .auth_schemas import (
    UserCreate, UserLogin as UserLoginSchema, UserResponse, UserUpdate,
    PasswordChange, APIKeyCreate as APIKeyCreateSchema, APIKeyResponse, APIKeyInfo,
    TokenResponse as TokenResponseSchema, RefreshTokenRequest as RefreshTokenRequestSchema,
    LoginSessionResponse, PasswordResetRequest, PasswordResetConfirm
)

# ルーター初期化
router = APIRouter(prefix="/auth", tags=["authentication"])

# 既存のPydanticモデルは削除し、auth_schemas.pyのものを使用


# ユーザー登録エンドポイント
@router.post("/register", response_model=UserResponse)
@limiter.limit("5/minute")  # 1分間に5回まで
async def register_user(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    新規ユーザー登録
    
    セキュリティ機能:
    - レート制限 (5回/分)
    - パスワード強度チェック
    - メールアドレス重複チェック
    """
    try:
        user = AuthService.register_user(
            db=db,
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name
        )
        
        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            last_login=user.last_login
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ユーザー登録に失敗しました"
        )


# ログインエンドポイント
@router.post("/login", response_model=TokenResponseSchema)
@limiter.limit("10/minute")  # 1分間に10回まで
async def login_user(
    request: Request,
    response: Response,
    user_data: UserLoginSchema,
    db: Session = Depends(get_db)
):
    """
    ユーザーログイン
    
    セキュリティ機能:
    - レート制限 (10回/分)
    - アカウントロック機能
    - ログイン試行の記録
    - リフレッシュトークンのHTTPOnlyクッキー設定
    """
    try:
        user = AuthService.authenticate_user(
            db=db,
            email=user_data.email,
            password=user_data.password,
            request=request
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="メールアドレスまたはパスワードが正しくありません"
            )
        
        # トークン生成
        tokens = AuthService.create_tokens(user, request)
        
        # リフレッシュトークンをHTTPOnlyクッキーに設定
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            max_age=7 * 24 * 60 * 60,  # 7日間
            httponly=True,
            secure=True,  # HTTPS必須
            samesite="strict"
        )
        
        # ユーザー情報を含めてレスポンスを返す
        user_response = UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            last_login=user.last_login
        )
        
        return TokenResponseSchema(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            expires_in=int(tokens["expires_in"]),
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ログインに失敗しました"
        )


# トークン更新エンドポイント
@router.post("/refresh", response_model=dict)
@limiter.limit("20/minute")  # 1分間に20回まで
async def refresh_token(
    request: Request,
    refresh_data: RefreshTokenRequestSchema,
    db: Session = Depends(get_db)
):
    """
    アクセストークン更新
    
    セキュリティ機能:
    - レート制限 (20回/分)
    - リフレッシュトークンの検証
    """
    try:
        tokens = AuthService.refresh_access_token(
            db=db,
            refresh_token=refresh_data.refresh_token
        )
        
        if not tokens:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="無効なリフレッシュトークンです"
            )
        
        return tokens
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="トークン更新に失敗しました"
        )


# ログアウトエンドポイント
@router.post("/logout")
async def logout_user(
    response: Response,
    current_user: User = Depends(require_authentication),
    db: Session = Depends(get_db)
):
    """
    ユーザーログアウト
    
    機能:
    - リフレッシュトークンの無効化
    - クッキーのクリア
    """
    try:
        # ユーザーのリフレッシュトークンを全て無効化
        refresh_tokens = db.query(RefreshToken).filter(
            RefreshToken.user_id == current_user.id,
            RefreshToken.is_active == True
        ).all()
        
        for token in refresh_tokens:
            token.revoke("logout")
        
        db.commit()
        
        # クッキークリア
        response.delete_cookie(key="refresh_token")
        
        return {"message": "ログアウトしました"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ログアウトに失敗しました"
        )


# プロフィール取得エンドポイント
@router.get("/profile", response_model=UserResponse)
async def get_user_profile(
    current_user: User = Depends(require_authentication)
):
    """現在のユーザープロフィールを取得"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )


# APIキー作成エンドポイント
@router.post("/api-keys", response_model=dict)
@limiter.limit("5/hour")  # 1時間に5回まで
async def create_api_key(
    request: Request,
    api_key_data: APIKeyCreateSchema,
    current_user: User = Depends(require_authentication),
    db: Session = Depends(get_db)
):
    """
    新しいAPIキーを作成
    
    セキュリティ機能:
    - レート制限 (5回/時間)
    - 認証必須
    - 一度だけ表示される平文キー
    """
    try:
        plain_key, api_key = AuthService.create_api_key(
            db=db,
            user_id=current_user.id,
            key_name=api_key_data.name,
            permissions=api_key_data.permissions,
            expires_days=api_key_data.expires_days
        )
        
        return {
            "message": "APIキーを作成しました",
            "api_key": plain_key,  # 一度だけ表示
            "key_id": api_key.id,
            "key_name": api_key.key_name,
            "warning": "このAPIキーは二度と表示されません。安全な場所に保管してください。"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="APIキーの作成に失敗しました"
        )


# APIキー一覧取得エンドポイント
@router.get("/api-keys", response_model=List[APIKeyResponse])
async def list_api_keys(
    current_user: User = Depends(require_authentication),
    db: Session = Depends(get_db)
):
    """ユーザーのAPIキー一覧を取得（平文キーは含まない）"""
    try:
        api_keys = AuthService.get_user_api_keys(db, current_user.id)
        
        return [
            APIKeyResponse(
                id=key.id,
                name=key.key_name,
                key_prefix=key.key_prefix,
                permissions=key.permissions,
                is_active=key.is_active,
                created_at=key.created_at,
                last_used_at=key.last_used_at,
                usage_count=key.usage_count,
                expires_at=key.expires_at
            )
            for key in api_keys
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="APIキー一覧の取得に失敗しました"
        )


# APIキー無効化エンドポイント
@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: int,
    current_user: User = Depends(require_authentication),
    db: Session = Depends(get_db)
):
    """APIキーを無効化"""
    try:
        success = AuthService.revoke_api_key(db, current_user.id, key_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="APIキーが見つかりません"
            )
        
        return {"message": "APIキーを無効化しました"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="APIキーの無効化に失敗しました"
        )


# ログイン履歴取得エンドポイント
@router.get("/login-history")
async def get_login_history(
    limit: int = 20,
    current_user: User = Depends(require_authentication),
    db: Session = Depends(get_db)
):
    """ユーザーのログイン履歴を取得"""
    try:
        sessions = db.query(LoginSession).filter(
            LoginSession.user_id == current_user.id
        ).order_by(LoginSession.attempted_at.desc()).limit(limit).all()
        
        return {
            "sessions": [
                {
                    "id": session.id,
                    "ip_address": session.ip_address,
                    "user_agent": session.user_agent,
                    "success": session.success,
                    "failure_reason": session.failure_reason,
                    "attempted_at": session.attempted_at,
                    "login_method": session.login_method
                }
                for session in sessions
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ログイン履歴の取得に失敗しました"
        )


# パスワード変更エンドポイント
@router.put("/change-password")
@limiter.limit("3/hour")  # 1時間に3回まで
async def change_password(
    request: Request,
    password_data: dict,
    current_user: User = Depends(require_authentication),
    db: Session = Depends(get_db)
):
    """
    パスワード変更
    
    セキュリティ機能:
    - レート制限 (3回/時間)
    - 現在のパスワード確認
    - 新しいパスワードの強度チェック
    """
    try:
        current_password = password_data.get("current_password")
        new_password = password_data.get("new_password")
        
        if not current_password or not new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="現在のパスワードと新しいパスワードが必要です"
            )
        
        # 現在のパスワード確認
        if not current_user.verify_password(current_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="現在のパスワードが正しくありません"
            )
        
        # 新しいパスワードの強度チェック
        if not AuthService._validate_password_strength(new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="新しいパスワードは8文字以上で、大文字・小文字・数字を含む必要があります"
            )
        
        # パスワード更新
        current_user.set_password(new_password)
        current_user.updated_at = datetime.utcnow()
        
        # 全てのリフレッシュトークンを無効化（セキュリティ）
        refresh_tokens = db.query(RefreshToken).filter(
            RefreshToken.user_id == current_user.id,
            RefreshToken.is_active == True
        ).all()
        
        for token in refresh_tokens:
            token.revoke("password_changed")
        
        db.commit()
        
        return {"message": "パスワードを変更しました。再ログインが必要です。"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="パスワード変更に失敗しました"
        )


# APIキーテストエンドポイント
@router.get("/test-api-key")
async def test_api_key(
    request: Request,
    user_and_key: tuple = Depends(require_api_key_auth)
):
    """APIキー認証テスト用エンドポイント"""
    user, api_key = user_and_key
    
    return {
        "message": "APIキー認証に成功しました",
        "user_id": user.id,
        "user_email": user.email,
        "api_key_name": api_key.key_name,
        "permissions": api_key.permissions.split(',') if api_key.permissions else [],
        "usage_count": api_key.usage_count
    }