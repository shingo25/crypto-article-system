#!/usr/bin/env python3
"""
認証サービス - セキュアなユーザー認証とAPIキー管理
"""

import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .database import get_db, SessionLocal
from .auth_models import (
    User, APIKey, RefreshToken, LoginSession,
    create_access_token, create_refresh_token, verify_token,
    extract_user_id_from_token, pwd_context
)

# レート制限設定
limiter = Limiter(key_func=get_remote_address)

# セキュリティ設定
security = HTTPBearer(auto_error=False)


class AuthService:
    """認証サービスクラス"""
    
    @staticmethod
    def register_user(db: Session, email: str, password: str, full_name: Optional[str] = None) -> User:
        """
        新規ユーザー登録
        
        Args:
            db: データベースセッション
            email: メールアドレス
            password: パスワード
            full_name: フルネーム（オプション）
            
        Returns:
            作成されたユーザーオブジェクト
            
        Raises:
            HTTPException: メールアドレスが既に使用されている場合
        """
        # メールアドレスの重複チェック
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ユーザー登録に失敗しました"  # ユーザー列挙を防ぐため一般的なメッセージを返す
            )
        
        # パスワード強度チェック
        if not AuthService._validate_password_strength(password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="パスワードは8文字以上で、大文字・小文字・数字を含む必要があります"
            )
        
        # 新規ユーザー作成
        user = User(
            email=email,
            full_name=full_name,
            is_active=True,
            is_verified=False  # メール認証実装時に使用
        )
        user.set_password(password)
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user
    
    @staticmethod
    def authenticate_user(
        db: Session, 
        email: str, 
        password: str, 
        request: Request
    ) -> Optional[User]:
        """
        ユーザー認証
        
        Args:
            db: データベースセッション
            email: メールアドレス
            password: パスワード
            request: リクエストオブジェクト（IP等の取得用）
            
        Returns:
            認証されたユーザーオブジェクト、失敗時はNone
        """
        user = db.query(User).filter(User.email == email).first()
        
        # ログインセッションを記録
        session_id = secrets.token_hex(32)
        ip_address = AuthService._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        if not user:
            # ユーザーが存在しない場合もセッションログを残す
            AuthService._log_login_attempt(
                db, None, session_id, ip_address, user_agent, False, "user_not_found"
            )
            return None
        
        if user.is_locked():
            AuthService._log_login_attempt(
                db, user.id, session_id, ip_address, user_agent, False, "account_locked"
            )
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="アカウントがロックされています。30分後に再試行してください。"
            )
        
        if not user.is_active:
            AuthService._log_login_attempt(
                db, user.id, session_id, ip_address, user_agent, False, "account_disabled"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="アカウントが無効化されています"
            )
        
        # パスワード検証
        if not user.verify_password(password):
            user.increment_failed_attempts()
            db.commit()
            
            AuthService._log_login_attempt(
                db, user.id, session_id, ip_address, user_agent, False, "invalid_password"
            )
            return None
        
        # 認証成功
        user.reset_failed_attempts()
        user.last_login = datetime.utcnow()
        db.commit()
        
        AuthService._log_login_attempt(
            db, user.id, session_id, ip_address, user_agent, True, None
        )
        
        return user
    
    @staticmethod
    def create_api_key(
        db: Session, 
        user_id: int, 
        key_name: str,
        permissions: List[str] = None,
        expires_days: Optional[int] = None
    ) -> tuple[str, APIKey]:
        """
        新しいAPIキーを生成
        
        Args:
            db: データベースセッション
            user_id: ユーザーID
            key_name: APIキーの名前
            permissions: 権限リスト
            expires_days: 有効期限（日数）
            
        Returns:
            (plain_key, api_key_object) のタプル
        """
        # ユーザーの存在確認
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ユーザーが見つかりません"
            )
        
        # 同名のAPIキーが既に存在するかチェック
        existing_key = db.query(APIKey).filter(
            APIKey.user_id == user_id,
            APIKey.key_name == key_name,
            APIKey.is_active == True
        ).first()
        
        if existing_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="同じ名前のAPIキーが既に存在します"
            )
        
        # APIキー生成
        plain_key, hashed_key = APIKey.generate_api_key()
        
        # 有効期限設定
        expires_at = None
        if expires_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_days)
        
        # APIキーオブジェクト作成
        api_key = APIKey(
            user_id=user_id,
            key_name=key_name,
            hashed_api_key=hashed_key,
            key_prefix=plain_key[:12],  # 'sk-xxxxxxxx' の部分
            permissions=','.join(permissions) if permissions else 'read',
            expires_at=expires_at
        )
        
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        
        return plain_key, api_key
    
    @staticmethod
    def verify_api_key(db: Session, api_key: str) -> Optional[tuple[User, APIKey]]:
        """
        APIキーを検証
        
        Args:
            db: データベースセッション
            api_key: 検証するAPIキー
            
        Returns:
            (user, api_key_object) のタプル、無効な場合はNone
        """
        if not api_key or not api_key.startswith('sk-'):
            return None
        
        # データベースから全ての有効なAPIキーを検索
        api_key_objs = db.query(APIKey).filter(
            APIKey.is_active == True
        ).all()
        
        # 各APIキーに対して検証
        api_key_obj = None
        for key_obj in api_key_objs:
            if key_obj.verify_api_key(api_key):
                api_key_obj = key_obj
                break
        
        if not api_key_obj:
            return None
        
        # 有効期限チェック
        if api_key_obj.is_expired():
            return None
        
        # ユーザー取得
        user = db.query(User).filter(
            User.id == api_key_obj.user_id,
            User.is_active == True
        ).first()
        
        if not user:
            return None
        
        # 使用統計更新
        api_key_obj.update_usage()
        db.commit()
        
        return user, api_key_obj
    
    @staticmethod
    def create_tokens(user: User, request: Request) -> Dict[str, Any]:
        """
        アクセストークンとリフレッシュトークンを生成
        
        Args:
            user: ユーザーオブジェクト
            request: リクエストオブジェクト
            
        Returns:
            トークン情報を含む辞書
        """
        # アクセストークン生成
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email},
            expires_delta=access_token_expires
        )
        
        # リフレッシュトークン生成
        refresh_token_expires = timedelta(days=7)
        refresh_token = create_refresh_token(
            data={"sub": str(user.id)},
            expires_delta=refresh_token_expires
        )
        
        # リフレッシュトークンをデータベースに保存
        db = SessionLocal()
        try:
            # 既存のリフレッシュトークンを無効化（デバイス制限）
            old_tokens = db.query(RefreshToken).filter(
                RefreshToken.user_id == user.id,
                RefreshToken.is_active == True
            ).all()
            
            for token in old_tokens:
                token.revoke("new_login")
            
            # 新しいリフレッシュトークンを保存
            refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
            refresh_token_obj = RefreshToken(
                user_id=user.id,
                token_hash=refresh_token_hash,
                device_info=request.headers.get("user-agent", ""),
                ip_address=AuthService._get_client_ip(request),
                expires_at=datetime.utcnow() + refresh_token_expires
            )
            
            db.add(refresh_token_obj)
            db.commit()
        finally:
            db.close()
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": access_token_expires.total_seconds()
        }
    
    @staticmethod
    def refresh_access_token(db: Session, refresh_token: str) -> Optional[Dict[str, Any]]:
        """
        リフレッシュトークンから新しいアクセストークンを生成
        
        Args:
            db: データベースセッション
            refresh_token: リフレッシュトークン
            
        Returns:
            新しいトークン情報、無効な場合はNone
        """
        # トークン検証
        payload = verify_token(refresh_token, "refresh")
        if not payload:
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        # データベースでトークン確認
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        refresh_token_obj = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.is_active == True
        ).first()
        
        if not refresh_token_obj or refresh_token_obj.is_expired():
            return None
        
        # ユーザー取得
        user = db.query(User).filter(
            User.id == int(user_id),
            User.is_active == True
        ).first()
        
        if not user:
            return None
        
        # 新しいアクセストークン生成
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email},
            expires_delta=access_token_expires
        )
        
        # 使用統計更新
        refresh_token_obj.last_used_at = datetime.utcnow()
        db.commit()
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": access_token_expires.total_seconds()
        }
    
    @staticmethod
    def revoke_api_key(db: Session, user_id: int, api_key_id: int) -> bool:
        """
        APIキーを無効化
        
        Args:
            db: データベースセッション
            user_id: ユーザーID
            api_key_id: APIキーID
            
        Returns:
            成功時True、失敗時False
        """
        api_key = db.query(APIKey).filter(
            APIKey.id == api_key_id,
            APIKey.user_id == user_id
        ).first()
        
        if not api_key:
            return False
        
        api_key.is_active = False
        db.commit()
        
        return True
    
    @staticmethod
    def get_user_api_keys(db: Session, user_id: int) -> List[APIKey]:
        """
        ユーザーのAPIキー一覧を取得
        
        Args:
            db: データベースセッション
            user_id: ユーザーID
            
        Returns:
            APIキーのリスト
        """
        return db.query(APIKey).filter(
            APIKey.user_id == user_id
        ).order_by(APIKey.created_at.desc()).all()
    
    @staticmethod
    def _validate_password_strength(password: str) -> bool:
        """パスワード強度チェック"""
        if len(password) < 8:
            return False
        
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        
        return has_upper and has_lower and has_digit
    
    @staticmethod
    def _get_client_ip(request: Request) -> str:
        """クライアントIPアドレスを取得"""
        # プロキシ経由の場合を考慮
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    @staticmethod
    def _log_login_attempt(
        db: Session,
        user_id: Optional[int],
        session_id: str,
        ip_address: str,
        user_agent: str,
        success: bool,
        failure_reason: Optional[str]
    ):
        """ログイン試行をログに記録"""
        login_session = LoginSession(
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            failure_reason=failure_reason
        )
        
        db.add(login_session)
        db.commit()


# 依存関数
def get_current_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """JWTトークンから現在のユーザーを取得"""
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = verify_token(token, "access")
    
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    user = db.query(User).filter(
        User.id == int(user_id),
        User.is_active == True
    ).first()
    
    return user


def get_current_user_from_api_key(
    api_key: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Optional[tuple[User, APIKey]]:
    """APIキーから現在のユーザーを取得"""
    if not api_key:
        return None
    
    return AuthService.verify_api_key(db, api_key)


def require_authentication(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """認証必須のエンドポイント用依存関数"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証が必要です",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = get_current_user_from_token(credentials, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なトークンです",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def require_api_key_auth(
    request: Request,
    db: Session = Depends(get_db)
) -> tuple[User, APIKey]:
    """APIキー認証必須のエンドポイント用依存関数"""
    api_key = request.headers.get("X-API-Key")
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="APIキーが必要です",
            headers={"X-API-Key": "Required"},
        )
    
    result = get_current_user_from_api_key(api_key, db)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なAPIキーです",
            headers={"X-API-Key": "Invalid"},
        )
    
    return result