#!/usr/bin/env python3
"""
ファクトチェック支援システム
生成された記事の事実確認を支援する機能を提供
"""

import os
import re
import json
import requests
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging
from dotenv import load_dotenv

load_dotenv()

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class FactCheckItem:
    """ファクトチェック項目"""
    text: str                    # チェック対象のテキスト
    fact_type: str              # price, date, percentage, name, etc.
    context: str                # 周辺のコンテキスト
    position: int               # 記事内での位置
    confidence: float = 0.0     # 確信度
    verified: Optional[bool] = None
    verification_source: Optional[str] = None
    correction: Optional[str] = None


class FactExtractor:
    """記事から事実確認が必要な項目を抽出"""
    
    def __init__(self):
        # パターン定義
        self.patterns = {
            'price': {
                'pattern': r'\$[\d,]+\.?\d*|[\d,]+\.?\d*\s*ドル|[\d,]+\.?\d*\s*円',
                'type': 'price'
            },
            'percentage': {
                'pattern': r'[\d\.]+\s*%|[\d\.]+\s*パーセント',
                'type': 'percentage'
            },
            'date': {
                'pattern': r'\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}月\d{1,2}日|\d{4}/\d{1,2}/\d{1,2}',
                'type': 'date'
            },
            'time_period': {
                'pattern': r'\d+\s*(?:時間|日|週間|ヶ月|年)(?:前|後|以内|以上)',
                'type': 'time_period'
            },
            'market_cap': {
                'pattern': r'時価総額.*?[\d,]+\.?\d*\s*(?:億|兆|million|billion)',
                'type': 'market_cap'
            },
            'ranking': {
                'pattern': r'第?\d+位|トップ\d+|ランキング\d+位',
                'type': 'ranking'
            }
        }
        
        # 暗号通貨名のリスト
        self.crypto_names = {
            'ビットコイン', 'イーサリアム', 'リップル', 'カルダノ', 'ソラナ',
            'ポルカドット', 'チェーンリンク', 'ポリゴン', 'アバランチ',
            'Bitcoin', 'Ethereum', 'Ripple', 'Cardano', 'Solana',
            'Polkadot', 'Chainlink', 'Polygon', 'Avalanche'
        }
    
    def extract_facts(self, content: str) -> List[FactCheckItem]:
        """記事から事実確認項目を抽出"""
        facts = []
        
        # 各パターンでマッチング
        for pattern_name, pattern_info in self.patterns.items():
            pattern = pattern_info['pattern']
            fact_type = pattern_info['type']
            
            for match in re.finditer(pattern, content, re.IGNORECASE):
                # コンテキストを取得（前後50文字）
                start = max(0, match.start() - 50)
                end = min(len(content), match.end() + 50)
                context = content[start:end]
                
                fact = FactCheckItem(
                    text=match.group(),
                    fact_type=fact_type,
                    context=context,
                    position=match.start()
                )
                facts.append(fact)
        
        # プロジェクト名の抽出
        for crypto_name in self.crypto_names:
            pattern = rf'\b{crypto_name}\b'
            for match in re.finditer(pattern, content, re.IGNORECASE):
                # 価格や数値に関連する文脈かチェック
                context_start = max(0, match.start() - 100)
                context_end = min(len(content), match.end() + 100)
                context = content[context_start:context_end]
                
                if any(keyword in context for keyword in ['価格', '値', 'price', '取引', 'trading']):
                    fact = FactCheckItem(
                        text=match.group(),
                        fact_type='crypto_name',
                        context=context,
                        position=match.start()
                    )
                    facts.append(fact)
        
        # 重複を除去
        unique_facts = self._remove_duplicates(facts)
        
        return sorted(unique_facts, key=lambda x: x.position)
    
    def _remove_duplicates(self, facts: List[FactCheckItem]) -> List[FactCheckItem]:
        """重複する事実項目を除去"""
        unique = []
        seen_texts = set()
        
        for fact in facts:
            key = f"{fact.text}_{fact.fact_type}"
            if key not in seen_texts:
                seen_texts.add(key)
                unique.append(fact)
        
        return unique


class PriceVerifier:
    """価格データの検証"""
    
    def __init__(self):
        self.coingecko_url = 'https://api.coingecko.com/api/v3'
        self.cache = {}  # APIレスポンスのキャッシュ
    
    def verify_price(self, crypto_name: str, price_text: str, context: str) -> Tuple[bool, Optional[str]]:
        """価格の妥当性を検証"""
        try:
            # 価格を数値に変換
            price = self._extract_price_value(price_text)
            if price is None:
                return False, None
            
            # 暗号通貨IDを取得
            coin_id = self._get_coin_id(crypto_name)
            if not coin_id:
                return False, None
            
            # 現在価格を取得
            current_price = self._get_current_price(coin_id)
            if current_price is None:
                return False, None
            
            # 許容範囲をチェック（±50%）
            lower_bound = current_price * 0.5
            upper_bound = current_price * 1.5
            
            if lower_bound <= price <= upper_bound:
                return True, f"現在価格: ${current_price:,.2f}"
            else:
                return False, f"現在価格: ${current_price:,.2f} (記載価格が範囲外)"
                
        except Exception as e:
            logger.error(f"Price verification error: {e}")
            return False, None
    
    def _extract_price_value(self, price_text: str) -> Optional[float]:
        """価格テキストから数値を抽出"""
        # 数字部分を抽出
        numbers = re.findall(r'[\d,]+\.?\d*', price_text)
        if not numbers:
            return None
        
        # カンマを除去して数値に変換
        try:
            return float(numbers[0].replace(',', ''))
        except ValueError:
            return None
    
    def _get_coin_id(self, crypto_name: str) -> Optional[str]:
        """暗号通貨名からCoinGecko IDを取得"""
        name_to_id = {
            'ビットコイン': 'bitcoin',
            'イーサリアム': 'ethereum',
            'リップル': 'ripple',
            'カルダノ': 'cardano',
            'ソラナ': 'solana',
            'Bitcoin': 'bitcoin',
            'Ethereum': 'ethereum',
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'XRP': 'ripple'
        }
        
        return name_to_id.get(crypto_name)
    
    def _get_current_price(self, coin_id: str) -> Optional[float]:
        """現在価格を取得"""
        if coin_id in self.cache:
            cached_data, timestamp = self.cache[coin_id]
            if datetime.now() - timestamp < timedelta(minutes=5):
                return cached_data
        
        try:
            response = requests.get(
                f"{self.coingecko_url}/simple/price",
                params={'ids': coin_id, 'vs_currencies': 'usd'}
            )
            
            if response.status_code == 200:
                data = response.json()
                price = data.get(coin_id, {}).get('usd')
                if price:
                    self.cache[coin_id] = (price, datetime.now())
                    return price
                    
        except Exception as e:
            logger.error(f"API error: {e}")
        
        return None


class DateVerifier:
    """日付の妥当性を検証"""
    
    def verify_date(self, date_text: str, context: str) -> Tuple[bool, Optional[str]]:
        """日付の妥当性をチェック"""
        try:
            # 日付を解析
            parsed_date = self._parse_date(date_text)
            if not parsed_date:
                return False, "日付の解析に失敗"
            
            # 未来の日付かチェック
            if parsed_date > datetime.now():
                return False, "未来の日付が記載されています"
            
            # あまりに古い日付かチェック（5年以上前）
            if parsed_date < datetime.now() - timedelta(days=365*5):
                # ビットコイン関連の歴史的な日付は許可
                if 'ビットコイン' in context and parsed_date.year >= 2009:
                    return True, "ビットコインの歴史的な日付"
                return False, "古すぎる日付の可能性"
            
            return True, None
            
        except Exception as e:
            logger.error(f"Date verification error: {e}")
            return False, None
    
    def _parse_date(self, date_text: str) -> Optional[datetime]:
        """日付テキストをdatetimeオブジェクトに変換"""
        # 日本語形式
        match = re.match(r'(\d{4})年(\d{1,2})月(\d{1,2})日', date_text)
        if match:
            year, month, day = map(int, match.groups())
            try:
                return datetime(year, month, day)
            except ValueError:
                return None
        
        # スラッシュ形式
        match = re.match(r'(\d{4})/(\d{1,2})/(\d{1,2})', date_text)
        if match:
            year, month, day = map(int, match.groups())
            try:
                return datetime(year, month, day)
            except ValueError:
                return None
        
        return None


class FactChecker:
    """ファクトチェックのメインクラス"""
    
    def __init__(self):
        self.extractor = FactExtractor()
        self.price_verifier = PriceVerifier()
        self.date_verifier = DateVerifier()
    
    def check_article(self, content: str) -> Dict:
        """記事全体をファクトチェック"""
        # 事実項目を抽出
        facts = self.extractor.extract_facts(content)
        
        # 各項目を検証
        results = {
            'total_facts': len(facts),
            'verified': 0,
            'failed': 0,
            'skipped': 0,
            'items': []
        }
        
        for fact in facts:
            verification_result = self._verify_fact(fact, content)
            
            if verification_result['verified'] is True:
                results['verified'] += 1
            elif verification_result['verified'] is False:
                results['failed'] += 1
            else:
                results['skipped'] += 1
            
            results['items'].append(verification_result)
        
        # 信頼度スコアを計算
        if results['total_facts'] > 0:
            results['reliability_score'] = (
                results['verified'] / results['total_facts'] * 100
            )
        else:
            results['reliability_score'] = 100
        
        return results
    
    def _verify_fact(self, fact: FactCheckItem, full_content: str) -> Dict:
        """個別の事実項目を検証"""
        result = {
            'text': fact.text,
            'type': fact.fact_type,
            'context': fact.context,
            'position': fact.position,
            'verified': None,
            'message': None,
            'suggestion': None
        }
        
        # 価格の検証
        if fact.fact_type == 'price':
            # コンテキストから暗号通貨名を探す
            crypto_name = self._find_crypto_name(fact.context)
            if crypto_name:
                verified, message = self.price_verifier.verify_price(
                    crypto_name, fact.text, fact.context
                )
                result['verified'] = verified
                result['message'] = message
        
        # 日付の検証
        elif fact.fact_type == 'date':
            verified, message = self.date_verifier.verify_date(
                fact.text, fact.context
            )
            result['verified'] = verified
            result['message'] = message
        
        # パーセンテージの検証
        elif fact.fact_type == 'percentage':
            # 極端な値をチェック
            try:
                value = float(re.findall(r'[\d\.]+', fact.text)[0])
                if value > 1000:
                    result['verified'] = False
                    result['message'] = "異常に高いパーセンテージ"
                elif value < -90:
                    result['verified'] = False
                    result['message'] = "異常に低いパーセンテージ"
                else:
                    result['verified'] = True
            except:
                result['verified'] = None
        
        return result
    
    def _find_crypto_name(self, context: str) -> Optional[str]:
        """コンテキストから暗号通貨名を探す"""
        for crypto_name in self.extractor.crypto_names:
            if crypto_name in context:
                return crypto_name
        return None
    
    def generate_report(self, check_results: Dict) -> str:
        """ファクトチェックレポートを生成"""
        report = []
        report.append("="*50)
        report.append("ファクトチェックレポート")
        report.append("="*50)
        
        report.append(f"\n総事実項目数: {check_results['total_facts']}")
        report.append(f"検証済み: {check_results['verified']} ✓")
        report.append(f"問題あり: {check_results['failed']} ✗")
        report.append(f"スキップ: {check_results['skipped']} -")
        report.append(f"信頼度スコア: {check_results['reliability_score']:.1f}%")
        
        if check_results['failed'] > 0:
            report.append("\n【要確認項目】")
            for item in check_results['items']:
                if item['verified'] is False:
                    report.append(f"\n✗ {item['text']}")
                    report.append(f"  種類: {item['type']}")
                    report.append(f"  理由: {item['message']}")
                    report.append(f"  文脈: ...{item['context']}...")
        
        return '\n'.join(report)


def main():
    """テスト実行"""
    # サンプル記事
    sample_article = """
    ビットコインが急騰、24時間で15%上昇し$45,000を突破
    
    2024年1月15日、ビットコイン（BTC）の価格が急騰し、過去24時間で15%上昇して$45,000を突破しました。
    この上昇により、ビットコインの時価総額は8,500億ドルに達し、暗号通貨市場全体の45%を占めています。
    
    イーサリアム（ETH）も好調で、$2,800まで回復。前日比12%の上昇を記録しました。
    アナリストによると、2024年3月までに$50,000を超える可能性があるとのことです。
    
    一方、リップル（XRP）は規制の懸念から5%下落し、$0.55で取引されています。
    """
    
    # ファクトチェッカーを初期化
    checker = FactChecker()
    
    # チェック実行
    print("ファクトチェックを実行中...")
    results = checker.check_article(sample_article)
    
    # レポート生成
    report = checker.generate_report(results)
    print(report)
    
    # 詳細結果をJSON形式で保存
    with open('fact_check_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print("\n詳細結果を fact_check_results.json に保存しました")


if __name__ == "__main__":
    main()