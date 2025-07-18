#!/usr/bin/env python3
"""
統合実行スクリプト
記事生成パイプライン全体を実行する
"""

import os
import sys
import argparse
import json
from datetime import datetime
from dotenv import load_dotenv

# 自作モジュール
from article_pipeline import ArticlePipeline, PipelineConfig
from fact_checker import FactChecker
from wordpress_publisher import ArticlePublisher

load_dotenv()


def check_environment():
    """環境変数のチェック"""
    required_vars = ['OPENAI_API_KEY']
    optional_vars = [
        'WORDPRESS_URL', 
        'WORDPRESS_USERNAME', 
        'WORDPRESS_APP_PASSWORD',
        'COINMARKETCAP_API_KEY'
    ]
    
    print("環境チェック...")
    print("-" * 50)
    
    missing_required = []
    for var in required_vars:
        if os.getenv(var):
            print(f"✓ {var}: 設定済み")
        else:
            print(f"✗ {var}: 未設定（必須）")
            missing_required.append(var)
    
    print("\nオプション設定:")
    for var in optional_vars:
        if os.getenv(var):
            print(f"✓ {var}: 設定済み")
        else:
            print(f"- {var}: 未設定")
    
    if missing_required:
        print(f"\n必須の環境変数が設定されていません: {', '.join(missing_required)}")
        print(".envファイルを確認してください")
        return False
    
    return True


def run_demo():
    """デモ実行（記事1件生成）"""
    print("\n=== デモモード: 記事1件を生成 ===\n")
    
    # 最小構成で実行
    config = PipelineConfig(
        max_articles_per_day=1,
        max_articles_per_hour=1,
        enable_wordpress_post=False,
        output_dir='./demo_output'
    )
    
    pipeline = ArticlePipeline(config)
    pipeline.run_once()
    
    # 生成された記事をチェック
    articles_dir = os.path.join(config.output_dir, 'articles')
    if os.path.exists(articles_dir):
        files = [f for f in os.listdir(articles_dir) if f.endswith('.html')]
        if files:
            print(f"\n✓ 記事が生成されました: {files[0]}")
            
            # ファクトチェックを実行
            article_path = os.path.join(articles_dir, files[0])
            with open(article_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            print("\nファクトチェック中...")
            checker = FactChecker()
            results = checker.check_article(content)
            print(checker.generate_report(results))


def run_full_pipeline(args):
    """フルパイプライン実行"""
    print("\n=== フルパイプライン実行 ===\n")
    
    # 設定を構築
    config = PipelineConfig(
        max_articles_per_day=args.max_daily,
        max_articles_per_hour=args.max_hourly,
        collection_interval_minutes=args.collection_interval,
        generation_interval_minutes=args.generation_interval,
        enable_wordpress_post=args.enable_wordpress,
        enable_fact_check=args.enable_fact_check,
        output_dir=args.output_dir
    )
    
    # パイプラインを実行
    pipeline = ArticlePipeline(config)
    
    if args.once:
        # 1回だけ実行
        pipeline.run_once()
        print("\n" + pipeline.generate_daily_report())
    else:
        # スケジュール実行
        print("スケジュール実行を開始します（Ctrl+Cで停止）")
        try:
            pipeline.run_scheduled()
        except KeyboardInterrupt:
            print("\n\n実行を停止しました")
            print(pipeline.generate_daily_report())


def test_wordpress():
    """WordPress接続テスト"""
    print("\n=== WordPress接続テスト ===\n")
    
    from wordpress_publisher import WordPressClient
    
    client = WordPressClient()
    if client.test_connection():
        print("\n✓ WordPress接続成功")
        
        # カテゴリ一覧
        categories = client.get_categories()
        print(f"\nカテゴリ数: {len(categories)}")
        
        # タグ一覧
        tags = client.get_tags()
        print(f"タグ数: {len(tags)}")
    else:
        print("\n✗ WordPress接続失敗")


def analyze_topics():
    """収集済みトピックの分析"""
    print("\n=== トピック分析 ===\n")
    
    from topic_collector import TopicManager, RSSFeedCollector, PriceDataCollector
    
    manager = TopicManager()
    
    # 収集
    print("トピックを収集中...")
    rss_collector = RSSFeedCollector()
    price_collector = PriceDataCollector()
    
    manager.add_topics(rss_collector.collect())
    manager.add_topics(price_collector.collect())
    
    # レポート表示
    print("\n" + manager.generate_topic_report())
    
    # トピックを保存
    manager.save_topics('analyzed_topics.json')
    print("\n分析結果を analyzed_topics.json に保存しました")


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(
        description='暗号通貨記事自動生成システム',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  # デモ実行（記事1件生成）
  python run_pipeline.py --demo
  
  # フルパイプラインを1回実行
  python run_pipeline.py --once
  
  # スケジュール実行（継続的に動作）
  python run_pipeline.py
  
  # WordPress接続テスト
  python run_pipeline.py --test-wordpress
  
  # トピック分析
  python run_pipeline.py --analyze-topics
        """
    )
    
    # 基本オプション
    parser.add_argument('--demo', action='store_true', 
                       help='デモモードで実行（記事1件生成）')
    parser.add_argument('--once', action='store_true',
                       help='パイプラインを1回だけ実行')
    parser.add_argument('--test-wordpress', action='store_true',
                       help='WordPress接続をテスト')
    parser.add_argument('--analyze-topics', action='store_true',
                       help='トピックを収集して分析')
    
    # パイプライン設定
    parser.add_argument('--max-daily', type=int, default=50,
                       help='1日の最大記事生成数（デフォルト: 50）')
    parser.add_argument('--max-hourly', type=int, default=10,
                       help='1時間の最大記事生成数（デフォルト: 10）')
    parser.add_argument('--collection-interval', type=int, default=30,
                       help='トピック収集間隔（分）（デフォルト: 30）')
    parser.add_argument('--generation-interval', type=int, default=5,
                       help='記事生成間隔（分）（デフォルト: 5）')
    
    # 機能オプション
    parser.add_argument('--enable-wordpress', action='store_true',
                       help='WordPress自動投稿を有効化')
    parser.add_argument('--enable-fact-check', action='store_true',
                       help='ファクトチェックを有効化')
    
    # その他
    parser.add_argument('--output-dir', type=str, default='./output',
                       help='出力ディレクトリ（デフォルト: ./output）')
    
    args = parser.parse_args()
    
    # 環境チェック
    if not check_environment():
        sys.exit(1)
    
    # コマンド実行
    if args.demo:
        run_demo()
    elif args.test_wordpress:
        test_wordpress()
    elif args.analyze_topics:
        analyze_topics()
    else:
        run_full_pipeline(args)


if __name__ == "__main__":
    main()