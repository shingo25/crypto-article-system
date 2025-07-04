#!/usr/bin/env python3
"""
認証システム用Pydanticスキーマ - 入力検証とレスポンス定義
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, validator


class UserCreate(BaseModel):
    """ユーザー作成リクエストスキーマ"""
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    full_name: Optional[str] = Field(None, max_length=100)
    
    @validator('password')
    def validate_password_strength(cls, v):
        """パスワード強度検証"""
        if not any(c.isupper() for c in v):
            raise ValueError('パスワードには少なくとも1つの大文字を含む必要があります')
        if not any(c.islower() for c in v):
            raise ValueError('パスワードには少なくとも1つの小文字を含む必要があります')
        if not any(c.isdigit() for c in v):
            raise ValueError('パスワードには少なくとも1つの数字を含む必要があります')
        return v


class UserLogin(BaseModel):
    """ユーザーログインリクエストスキーマ"""
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """ユーザー情報更新スキーマ"""
    full_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    """パスワード変更スキーマ"""
    current_password: str
    new_password: str = Field(min_length=8, max_length=100)
    
    @validator('new_password')
    def validate_password_strength(cls, v, values):
        """新しいパスワードの強度検証"""
        if 'current_password' in values and v == values['current_password']:
            raise ValueError('新しいパスワードは現在のパスワードと異なる必要があります')
        
        if not any(c.isupper() for c in v):
            raise ValueError('パスワードには少なくとも1つの大文字を含む必要があります')
        if not any(c.islower() for c in v):
            raise ValueError('パスワードには少なくとも1つの小文字を含む必要があります')
        if not any(c.isdigit() for c in v):
            raise ValueError('パスワードには少なくとも1つの数字を含む必要があります')
        return v


class APIKeyCreate(BaseModel):
    """APIキー作成リクエストスキーマ"""
    key_name: str = Field(min_length=1, max_length=100)
    permissions: Optional[str] = Field(None, max_length=500)
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)
    rate_limit_per_minute: Optional[int] = Field(60, ge=1, le=1000)


class APIKeyResponse(BaseModel):
    """APIキー作成レスポンススキーマ"""
    id: int
    key_name: str
    api_key: str  # 作成時のみ返される平文キー
    key_prefix: str
    permissions: Optional[str]
    expires_at: Optional[datetime]
    rate_limit_per_minute: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class APIKeyInfo(BaseModel):
    """APIキー情報スキーマ（平文キーは含まない）"""
    id: int
    key_name: str
    key_prefix: str
    permissions: Optional[str]
    last_used_at: Optional[datetime]
    usage_count: int
    is_active: bool
    expires_at: Optional[datetime]
    rate_limit_per_minute: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """ユーザー情報レスポンススキーマ"""
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """トークンレスポンススキーマ"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    """リフレッシュトークンリクエストスキーマ"""
    refresh_token: str


class LoginSessionResponse(BaseModel):
    """ログインセッション情報スキーマ"""
    id: int
    ip_address: str
    user_agent: Optional[str]
    login_method: str
    success: bool
    failure_reason: Optional[str]
    attempted_at: datetime
    
    class Config:
        from_attributes = True


class PasswordResetRequest(BaseModel):
    """パスワードリセットリクエストスキーマ"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """パスワードリセット確認スキーマ"""
    token: str
    new_password: str = Field(min_length=8, max_length=100)
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        """パスワード強度検証"""
        if not any(c.isupper() for c in v):
            raise ValueError('パスワードには少なくとも1つの大文字を含む必要があります')
        if not any(c.islower() for c in v):
            raise ValueError('パスワードには少なくとも1つの小文字を含む必要があります')
        if not any(c.isdigit() for c in v):
            raise ValueError('パスワードには少なくとも1つの数字を含む必要があります')
        return v