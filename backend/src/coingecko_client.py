#!/usr/bin/env python3
"""
CoinGecko API client for fetching cryptocurrency market data
"""

import requests
import os
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

COINGECKO_API_URL = "https://api.coingecko.com/api/v3"

class CoinGeckoClient:
    """CoinGecko API client for fetching cryptocurrency data"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("COINGECKO_API_KEY")
        self.base_url = COINGECKO_API_URL
        self.session = requests.Session()
        
        # APIキーが設定されている場合はヘッダーに追加
        if self.api_key:
            self.session.headers.update({
                "X-CG-Demo-API-Key": self.api_key
            })
    
    def get_market_data(self, limit: int = 100, vs_currency: str = "usd") -> Optional[List[Dict[str, Any]]]:
        """
        CoinGeckoから市場データを取得する
        
        Args:
            limit: 取得する通貨数（デフォルト100）
            vs_currency: 基準通貨（デフォルトUSD）
            
        Returns:
            市場データのリスト、エラーの場合はNone
        """
        try:
            params = {
                "vs_currency": vs_currency,
                "order": "market_cap_desc",
                "per_page": min(limit, 250),  # CoinGeckoの制限に合わせる
                "page": 1,
                "sparkline": False,
                "price_change_percentage": "24h,7d"
            }
            
            logger.info(f"Fetching market data from CoinGecko (limit: {limit})")
            response = self.session.get(f"{self.base_url}/coins/markets", params=params)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched {len(data)} coins from CoinGecko")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching data from CoinGecko: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_market_data: {e}")
            return None
    
    def get_trending_coins(self) -> Optional[Dict[str, Any]]:
        """
        トレンドコインの情報を取得
        
        Returns:
            トレンドデータ、エラーの場合はNone
        """
        try:
            logger.info("Fetching trending coins from CoinGecko")
            response = self.session.get(f"{self.base_url}/search/trending")
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched trending data")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching trending coins from CoinGecko: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_trending_coins: {e}")
            return None
    
    def get_global_data(self) -> Optional[Dict[str, Any]]:
        """
        グローバル市場データを取得
        
        Returns:
            グローバルデータ、エラーの場合はNone
        """
        try:
            logger.info("Fetching global market data from CoinGecko")
            response = self.session.get(f"{self.base_url}/global")
            response.raise_for_status()
            
            data = response.json()
            logger.info("Successfully fetched global market data")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching global data from CoinGecko: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_global_data: {e}")
            return None
    
    def get_coin_details(self, coin_id: str) -> Optional[Dict[str, Any]]:
        """
        特定のコインの詳細情報を取得
        
        Args:
            coin_id: CoinGeckoのコインID
            
        Returns:
            コインの詳細データ、エラーの場合はNone
        """
        try:
            logger.info(f"Fetching details for coin: {coin_id}")
            params = {
                "localization": "false",
                "tickers": "false",
                "market_data": "true",
                "community_data": "false",
                "developer_data": "false",
                "sparkline": "false"
            }
            
            response = self.session.get(f"{self.base_url}/coins/{coin_id}", params=params)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched details for {coin_id}")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching coin details for {coin_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_coin_details: {e}")
            return None

# グローバルクライアントインスタンス
_client = None

def get_client() -> CoinGeckoClient:
    """CoinGeckoクライアントのシングルトンインスタンスを取得"""
    global _client
    if _client is None:
        _client = CoinGeckoClient()
    return _client

# 便利関数
def get_market_data(limit: int = 100) -> Optional[List[Dict[str, Any]]]:
    """市場データを取得する便利関数"""
    return get_client().get_market_data(limit)

def get_trending_coins() -> Optional[Dict[str, Any]]:
    """トレンドコインを取得する便利関数"""
    return get_client().get_trending_coins()

def get_global_data() -> Optional[Dict[str, Any]]:
    """グローバル市場データを取得する便利関数"""
    return get_client().get_global_data()