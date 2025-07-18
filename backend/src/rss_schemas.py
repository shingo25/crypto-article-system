#!/usr/bin/env python3
"""
RSS source management schemas using Pydantic
"""

from pydantic import BaseModel, HttpUrl, validator
from typing import Optional
from datetime import datetime

class RSSSourceBase(BaseModel):
    """RSS source base schema"""
    name: str
    url: str
    category: str
    description: Optional[str] = None
    enabled: bool = True

    @validator('category')
    def validate_category(cls, v):
        allowed_categories = ['news', 'analysis', 'market', 'technology']
        if v not in allowed_categories:
            raise ValueError(f'Category must be one of: {", ".join(allowed_categories)}')
        return v

    @validator('url')
    def validate_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v

class RSSSourceCreate(RSSSourceBase):
    """RSS source creation schema"""
    pass

class RSSSourceUpdate(BaseModel):
    """RSS source update schema"""
    name: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None

    @validator('category')
    def validate_category(cls, v):
        if v is not None:
            allowed_categories = ['news', 'analysis', 'market', 'technology']
            if v not in allowed_categories:
                raise ValueError(f'Category must be one of: {", ".join(allowed_categories)}')
        return v

    @validator('url')
    def validate_url(cls, v):
        if v is not None and not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v

class RSSSourceInDB(RSSSourceBase):
    """RSS source database schema"""
    id: str
    status: str = "active"
    lastCollected: Optional[datetime] = None
    totalCollected: int = 0
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

class RSSSourceResponse(RSSSourceInDB):
    """RSS source API response schema"""
    pass