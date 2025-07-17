#!/usr/bin/env python3
"""
デフォルトテンプレートをデータベースに追加するマイグレーションスクリプト
"""

from src.database import SessionLocal, ArticleTemplate, create_tables
from datetime import datetime

def create_default_templates():
    """デフォルトテンプレートを作成"""
    
    templates = [
        {
            'name': 'マーケット分析',
            'description': '暗号通貨の市場動向を分析する記事テンプレート',
            'category': 'market_analysis',
            'article_type': 'analysis',
            'tone': 'professional',
            'target_length': 1200,
            'structure': [
                '概要・サマリー',
                '現在の市場状況',
                '価格動向分析',
                '重要なイベント・ニュース',
                '技術指標分析',
                '今後の見通し',
                'まとめ'
            ],
            'required_elements': ['価格チャート', 'ボリューム分析', '技術指標', '市場センチメント'],
            'keywords_template': ['暗号通貨', '市場分析', '価格予測', 'テクニカル分析'],
            'system_prompt': 'あなたは暗号通貨の専門アナリストです。客観的なデータに基づいて市場分析を行い、投資判断に有用な情報を提供してください。',
            'user_prompt_template': '{coin_name}の市場分析記事を作成してください。現在の価格は{current_price}、24時間変動率は{price_change_24h}%です。',
            'seo_title_template': '{coin_name}マーケット分析 | 最新価格動向と投資戦略',
            'meta_description_template': '{coin_name}の最新市場分析。価格動向、技術指標、今後の見通しを専門アナリストが解説。',
            'usage_count': 0,
            'is_active': True,
            'is_public': True
        },
        {
            'name': '新規コイン紹介',
            'description': '新しく上場した暗号通貨の紹介記事テンプレート',
            'category': 'coin_review',
            'article_type': 'review',
            'tone': 'professional',
            'target_length': 800,
            'structure': [
                'コイン概要',
                'プロジェクトの目的・ビジョン',
                '技術的特徴',
                'トークノミクス',
                'チーム・パートナーシップ',
                'ロードマップ',
                'リスク要因',
                '投資判断'
            ],
            'required_elements': ['プロジェクト概要', 'トークン詳細', 'チーム情報', 'ロードマップ'],
            'keywords_template': ['新規上場', 'アルトコイン', 'DeFi', 'プロジェクト分析'],
            'system_prompt': 'あなたは暗号通貨プロジェクトの調査専門家です。新規プロジェクトを公正に評価し、投資家に有用な情報を提供してください。',
            'user_prompt_template': '{project_name}({token_symbol})の詳細分析記事を作成してください。プロジェクトの特徴: {project_features}',
            'seo_title_template': '{project_name}({token_symbol})とは？新規暗号通貨の完全ガイド',
            'meta_description_template': '{project_name}の特徴、技術、投資価値を詳しく解説。新規暗号通貨の投資判断に必要な情報をお届け。',
            'usage_count': 0,
            'is_active': True,
            'is_public': True
        },
        {
            'name': 'テクニカル分析',
            'description': 'チャート分析に特化した記事テンプレート',
            'category': 'technical_analysis',
            'article_type': 'analysis',
            'tone': 'technical',
            'target_length': 1000,
            'structure': [
                'チャート概要',
                'サポート・レジスタンスライン',
                'トレンドライン分析',
                'テクニカル指標分析',
                'パターン分析',
                '短期・中期・長期予測',
                'トレード戦略',
                'リスク管理'
            ],
            'required_elements': ['価格チャート', 'テクニカル指標', 'トレンドライン', 'ボリューム分析'],
            'keywords_template': ['テクニカル分析', 'チャート分析', 'トレンド', 'サポートライン', 'レジスタンスライン'],
            'system_prompt': 'あなたは経験豊富なテクニカルアナリストです。チャートパターンと技術指標を用いて、精密な分析を行ってください。',
            'user_prompt_template': '{coin_name}のテクニカル分析を行ってください。現在価格: {current_price}、重要なサポートライン: {support_level}、レジスタンスライン: {resistance_level}',
            'seo_title_template': '{coin_name}テクニカル分析 | チャートパターンと予測',
            'meta_description_template': '{coin_name}の詳細テクニカル分析。チャートパターン、技術指標、トレード戦略を専門家が解説。',
            'usage_count': 0,
            'is_active': True,
            'is_public': True
        },
        {
            'name': 'ニュース解説',
            'description': '暗号通貨関連ニュースの解説記事テンプレート',
            'category': 'news_analysis',
            'article_type': 'news',
            'tone': 'casual',
            'target_length': 600,
            'structure': [
                'ニュース概要',
                '背景・コンテキスト',
                '市場への影響分析',
                '関連銘柄への影響',
                '今後の展開予測',
                'まとめ'
            ],
            'required_elements': ['ニュースソース', '影響分析', '関連銘柄', '時系列情報'],
            'keywords_template': ['暗号通貨ニュース', '市場影響', '規制', 'DeFi', 'NFT'],
            'system_prompt': 'あなたは暗号通貨ニュースの解説専門家です。複雑なニュースを分かりやすく解説し、市場への影響を分析してください。',
            'user_prompt_template': '以下のニュースについて解説記事を作成してください: {news_content}。関連する暗号通貨: {related_coins}',
            'seo_title_template': '{news_title} | 暗号通貨市場への影響を解説',
            'meta_description_template': '{news_title}の詳細解説。暗号通貨市場への影響と今後の展開を分析。',
            'usage_count': 0,
            'is_active': True,
            'is_public': True
        }
    ]
    
    # データベースセッションを開始
    db = SessionLocal()
    
    try:
        # 既存のテンプレートをチェック
        existing_count = db.query(ArticleTemplate).count()
        if existing_count > 0:
            print(f"既に{existing_count}個のテンプレートが存在します。")
            return
        
        # テンプレートを追加
        for template_data in templates:
            template = ArticleTemplate(**template_data)
            db.add(template)
        
        db.commit()
        print(f"{len(templates)}個のデフォルトテンプレートを追加しました。")
        
        # 確認
        total_count = db.query(ArticleTemplate).count()
        print(f"データベース内のテンプレート総数: {total_count}")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("デフォルトテンプレートのマイグレーションを開始...")
    
    # テーブルが存在することを確認
    create_tables()
    
    # デフォルトテンプレートを作成
    create_default_templates()
    
    print("マイグレーション完了！")