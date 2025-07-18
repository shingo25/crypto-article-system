#!/usr/bin/env python3
"""
RSS source management API routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import logging
from datetime import datetime
import uuid

from .database import get_db
from .rss_schemas import RSSSourceCreate, RSSSourceUpdate, RSSSourceResponse
from .auth_middleware import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

# SQLAlchemy raw SQL queries for RSS source management
# (Prismaがない場合のSQLite対応)

@router.get("/rss-sources", response_model=List[RSSSourceResponse])
async def get_rss_sources(
    skip: int = 0,
    limit: int = 100,
    category: str = None,
    enabled: bool = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """RSS source list retrieval"""
    try:
        # Base query
        query = """
            SELECT id, name, url, category, description, enabled, status, 
                   lastCollected, totalCollected, createdAt, updatedAt
            FROM rss_sources
            WHERE 1=1
        """
        params = {}
        
        # Apply filters
        if category:
            query += " AND category = :category"
            params["category"] = category
            
        if enabled is not None:
            query += " AND enabled = :enabled"
            params["enabled"] = enabled
            
        query += " ORDER BY createdAt DESC LIMIT :limit OFFSET :skip"
        params["limit"] = limit
        params["skip"] = skip
        
        result = db.execute(text(query), params)
        sources = result.fetchall()
        
        # Convert to response format
        rss_sources = []
        for source in sources:
            rss_sources.append({
                "id": source.id,
                "name": source.name,
                "url": source.url,
                "category": source.category,
                "description": source.description,
                "enabled": bool(source.enabled),
                "status": source.status,
                "lastCollected": source.lastCollected,
                "totalCollected": source.totalCollected or 0,
                "createdAt": source.createdAt,
                "updatedAt": source.updatedAt
            })
        
        logger.info(f"Retrieved {len(rss_sources)} RSS sources")
        return rss_sources
        
    except Exception as e:
        logger.error(f"Error retrieving RSS sources: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve RSS sources"
        )

@router.post("/rss-sources", response_model=RSSSourceResponse)
async def create_rss_source(
    source_data: RSSSourceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create new RSS source"""
    try:
        # Check for duplicate URL
        existing = db.execute(
            text("SELECT id FROM rss_sources WHERE url = :url"),
            {"url": source_data.url}
        ).fetchone()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="RSS source with this URL already exists"
            )
        
        # Create new source
        source_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        query = """
            INSERT INTO rss_sources 
            (id, name, url, category, description, enabled, status, totalCollected, createdAt, updatedAt)
            VALUES (:id, :name, :url, :category, :description, :enabled, :status, :totalCollected, :createdAt, :updatedAt)
        """
        
        db.execute(text(query), {
            "id": source_id,
            "name": source_data.name,
            "url": source_data.url,
            "category": source_data.category,
            "description": source_data.description,
            "enabled": source_data.enabled,
            "status": "active",
            "totalCollected": 0,
            "createdAt": now,
            "updatedAt": now
        })
        
        db.commit()
        
        # Return created source
        result = db.execute(
            text("SELECT * FROM rss_sources WHERE id = :id"),
            {"id": source_id}
        ).fetchone()
        
        logger.info(f"Created RSS source: {source_data.name}")
        
        return {
            "id": result.id,
            "name": result.name,
            "url": result.url,
            "category": result.category,
            "description": result.description,
            "enabled": bool(result.enabled),
            "status": result.status,
            "lastCollected": result.lastCollected,
            "totalCollected": result.totalCollected or 0,
            "createdAt": result.createdAt,
            "updatedAt": result.updatedAt
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating RSS source: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create RSS source"
        )

@router.put("/rss-sources/{source_id}", response_model=RSSSourceResponse)
async def update_rss_source(
    source_id: str,
    source_data: RSSSourceUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update RSS source"""
    try:
        # Check if source exists
        existing = db.execute(
            text("SELECT * FROM rss_sources WHERE id = :id"),
            {"id": source_id}
        ).fetchone()
        
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="RSS source not found"
            )
        
        # Build update query
        update_fields = []
        params = {"id": source_id, "updatedAt": datetime.utcnow()}
        
        if source_data.name is not None:
            update_fields.append("name = :name")
            params["name"] = source_data.name
            
        if source_data.url is not None:
            # Check for duplicate URL (excluding current source)
            duplicate = db.execute(
                text("SELECT id FROM rss_sources WHERE url = :url AND id != :id"),
                {"url": source_data.url, "id": source_id}
            ).fetchone()
            
            if duplicate:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="RSS source with this URL already exists"
                )
            
            update_fields.append("url = :url")
            params["url"] = source_data.url
            
        if source_data.category is not None:
            update_fields.append("category = :category")
            params["category"] = source_data.category
            
        if source_data.description is not None:
            update_fields.append("description = :description")
            params["description"] = source_data.description
            
        if source_data.enabled is not None:
            update_fields.append("enabled = :enabled")
            params["enabled"] = source_data.enabled
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        # Execute update
        update_fields.append("updatedAt = :updatedAt")
        query = f"UPDATE rss_sources SET {', '.join(update_fields)} WHERE id = :id"
        
        db.execute(text(query), params)
        db.commit()
        
        # Return updated source
        result = db.execute(
            text("SELECT * FROM rss_sources WHERE id = :id"),
            {"id": source_id}
        ).fetchone()
        
        logger.info(f"Updated RSS source: {source_id}")
        
        return {
            "id": result.id,
            "name": result.name,
            "url": result.url,
            "category": result.category,
            "description": result.description,
            "enabled": bool(result.enabled),
            "status": result.status,
            "lastCollected": result.lastCollected,
            "totalCollected": result.totalCollected or 0,
            "createdAt": result.createdAt,
            "updatedAt": result.updatedAt
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating RSS source: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update RSS source"
        )

@router.delete("/rss-sources/{source_id}")
async def delete_rss_source(
    source_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete RSS source"""
    try:
        # Check if source exists
        existing = db.execute(
            text("SELECT * FROM rss_sources WHERE id = :id"),
            {"id": source_id}
        ).fetchone()
        
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="RSS source not found"
            )
        
        # Delete source
        db.execute(
            text("DELETE FROM rss_sources WHERE id = :id"),
            {"id": source_id}
        )
        db.commit()
        
        logger.info(f"Deleted RSS source: {source_id}")
        
        return {"message": "RSS source deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting RSS source: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete RSS source"
        )

@router.post("/rss-sources/{source_id}/test")
async def test_rss_source(
    source_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Test RSS source connectivity"""
    try:
        # Get source
        source = db.execute(
            text("SELECT * FROM rss_sources WHERE id = :id"),
            {"id": source_id}
        ).fetchone()
        
        if not source:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="RSS source not found"
            )
        
        # Test RSS feed
        import feedparser
        feed = feedparser.parse(source.url)
        
        success = not feed.bozo
        article_count = len(feed.entries) if hasattr(feed, 'entries') else 0
        
        # Update last test time
        db.execute(
            text("UPDATE rss_sources SET lastCollected = :now WHERE id = :id"),
            {"now": datetime.utcnow(), "id": source_id}
        )
        db.commit()
        
        return {
            "success": success,
            "article_count": article_count,
            "feed_title": getattr(feed.feed, 'title', 'Unknown'),
            "error": str(feed.bozo_exception) if feed.bozo and hasattr(feed, 'bozo_exception') else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing RSS source: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to test RSS source"
        )