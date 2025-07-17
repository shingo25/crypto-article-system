#!/usr/bin/env python3
"""
認証システム用データベースモデル
JWT認証とAPIキー管理のためのセキュアなテーブル定義
"""

import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from passlib.context import CryptContext
from jose import JWTError, jwt

# 既存のBase定義をインポート
from .database import Base

# パスワードハッシュ化コンテキスト
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT設定
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("環境変数 'JWT_SECRET_KEY' が設定されていません。セキュリティ上、この値は必須です。")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))


class User(Base):
    """ユーザーテーブル - セキュアな認証情報を管理"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # ユーザー情報
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # セキュリティ
    failed_login_attempts = Column(Integer, default=0)
    last_failed_login = Column(DateTime)
    locked_until = Column(DateTime)
    
    # タイムスタンプ
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    
    # リレーション
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    login_sessions = relationship("LoginSession", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', active={self.is_active})>"
    
    def verify_password(self, password: str) -> bool:
        """パスワードを検証"""
        return pwd_context.verify(password, self.hashed_password)
    
    def set_password(self, password: str):
        """パスワードをハッシュ化して設定"""
        self.hashed_password = pwd_context.hash(password)
    
    def is_locked(self) -> bool:
        """アカウントがロックされているかチェック"""
        if self.locked_until and datetime.utcnow() < self.locked_until:
            return True
        return False
    
    def increment_failed_attempts(self):
        """ログイン失敗回数を増加"""
        self.failed_login_attempts += 1
        self.last_failed_login = datetime.utcnow()
        
        # 5回失敗でアカウントを30分ロック
        if self.failed_login_attempts >= 5:
            self.locked_until = datetime.utcnow() + timedelta(minutes=30)
    
    def reset_failed_attempts(self):
        """ログイン失敗回数をリセット"""
        self.failed_login_attempts = 0
        self.last_failed_login = None
        self.locked_until = None


class APIKey(Base):
    """APIキーテーブル - ハッシュ化されたAPIキーを安全に保存"""
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # APIキー情報
    key_name = Column(String(100), nullable=False)  # ユーザーが識別用に設定する名前
    hashed_api_key = Column(String(255), unique=True, nullable=False, index=True)  # SHA-256ハッシュ値
    key_prefix = Column(String(20), nullable=False)  # 'sk-xxxxx' のような識別可能なプレフィックス
    
    # アクセス権限
    permissions = Column(String(500))  # read, write, admin など（カンマ区切り）
    
    # 使用状況
    last_used_at = Column(DateTime)
    usage_count = Column(Integer, default=0)
    
    # セキュリティ
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime)  # APIキーの有効期限（オプション）
    
    # レート制限
    rate_limit_per_minute = Column(Integer, default=60)  # 1分あたりのリクエスト数制限
    
    # タイムスタンプ
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # リレーション
    user = relationship("User", back_populates="api_keys")
    
    # インデックス
    __table_args__ = (
        Index('idx_api_keys_user_active', 'user_id', 'is_active'),
    )
    
    def __repr__(self):
        return f"<APIKey(id={self.id}, user_id={self.user_id}, name='{self.key_name}', active={self.is_active})>"
    
    @staticmethod
    def generate_api_key() -> tuple[str, str]:
        """
        新しいAPIキーを生成
        Returns: (plain_key, hashed_key) のタプル
        """
        # セキュアなランダムキーを生成（256bits = 32bytes）
        key_bytes = secrets.token_bytes(32)
        plain_key = f"sk-{key_bytes.hex()}"
        
        # bcryptでハッシュ化（より安全）
        hashed_key = pwd_context.hash(plain_key)
        
        return plain_key, hashed_key
    
    @staticmethod
    def hash_api_key(plain_key: str) -> str:
        """APIキーをハッシュ化"""
        return pwd_context.hash(plain_key)
    
    def verify_api_key(self, plain_key: str) -> bool:
        """
        APIキーを検証
        互換性のため、まずSHA-256で検証し、失敗したらbcryptで検証
        """
        # 旧式（SHA-256）の検証
        legacy_hashed = hashlib.sha256(plain_key.encode()).hexdigest()
        if self.hashed_api_key == legacy_hashed:
            return True
        
        # 新式（bcrypt）の検証
        try:
            return pwd_context.verify(plain_key, self.hashed_api_key)
        except:
            return False
    
    def is_expired(self) -> bool:
        """APIキーが期限切れかチェック"""
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return True
        return False
    
    def update_usage(self):
        """使用統計を更新"""
        self.last_used_at = datetime.utcnow()
        self.usage_count += 1


class RefreshToken(Base):
    """リフレッシュトークンテーブル - JWT更新用の安全なトークン管理"""
    __tablename__ = "refresh_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # トークン情報
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    device_info = Column(String(500))  # ユーザーエージェント等のデバイス情報
    ip_address = Column(String(45))  # IPv4/IPv6対応
    
    # 有効期限
    expires_at = Column(DateTime, nullable=False)
    
    # セキュリティ
    is_active = Column(Boolean, default=True)
    revoked_at = Column(DateTime)
    revoked_reason = Column(String(100))  # 'logout', 'security', 'expired'
    
    # タイムスタンプ
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime)
    
    # リレーション
    user = relationship("User", back_populates="refresh_tokens")
    
    def __repr__(self):
        return f"<RefreshToken(id={self.id}, user_id={self.user_id}, active={self.is_active})>"
    
    def is_expired(self) -> bool:
        """トークンが期限切れかチェック"""
        return datetime.utcnow() > self.expires_at
    
    def revoke(self, reason: str = 'manual'):
        """トークンを無効化"""
        self.is_active = False
        self.revoked_at = datetime.utcnow()
        self.revoked_reason = reason


class LoginSession(Base):
    """ログインセッションテーブル - セキュリティ監視用"""
    __tablename__ = "login_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # セッション情報
    session_id = Column(String(255), unique=True, nullable=False, index=True)
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(Text)
    
    # 認証情報
    login_method = Column(String(50), default='password')  # 'password', 'api_key', 'oauth'
    success = Column(Boolean, nullable=False)
    failure_reason = Column(String(100))  # 'invalid_credentials', 'account_locked', etc.
    
    # タイムスタンプ
    attempted_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # リレーション
    user = relationship("User", back_populates="login_sessions")
    
    # インデックス
    __table_args__ = (
        Index('idx_login_sessions_user_time', 'user_id', 'attempted_at'),
        Index('idx_login_sessions_ip_time', 'ip_address', 'attempted_at'),
    )
    
    def __repr__(self):
        return f"<LoginSession(id={self.id}, user_id={self.user_id}, success={self.success}, ip='{self.ip_address}')>"


# JWTトークン処理関数
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """アクセストークンを生成"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    """リフレッシュトークンを生成"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """トークンを検証"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # トークンタイプを確認
        if payload.get("type") != token_type:
            return None
            
        return payload
    except JWTError:
        return None


def extract_user_id_from_token(token: str) -> Optional[int]:
    """トークンからユーザーIDを抽出"""
    payload = verify_token(token)
    if payload:
        return payload.get("sub")
    return None