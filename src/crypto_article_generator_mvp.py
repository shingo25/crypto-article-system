#!/usr/bin/env python3
"""
暗号通貨記事生成システム MVP
基本的な記事生成機能を実装したプロトタイプ
"""

import os
import json
import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum
import requests
from dotenv import load_dotenv

# 環境変数を読み込み
load_dotenv()


class ArticleType(Enum):
    """記事タイプの定義"""
    BREAKING_NEWS = "breaking_news"
    PRICE_ANALYSIS = "price_analysis"
    TECHNICAL_ANALYSIS = "technical_analysis"
    PROJECT_UPDATE = "project_update"
    EDUCATIONAL = "educational"
    MARKET_OVERVIEW = "market_overview"


class ArticleDepth(Enum):
    """記事の深度レベル"""
    SHALLOW = "shallow"  # 速報・簡易記事（300-500文字）
    MEDIUM = "medium"    # 標準記事（600-1000文字）
    DEEP = "deep"        # 詳細記事（1000-1500文字）


class AIProvider(Enum):
    """AIプロバイダーの定義"""
    OPENAI = "openai"
    CLAUDE = "claude"
    GEMINI = "gemini"


class AIModel(Enum):
    """AIモデルの定義（2025年6月版）"""
    # OpenAI Models
    GPT_4_TURBO = "gpt-4-turbo"
    GPT_4O = "gpt-4o"
    GPT_4O_MINI = "gpt-4o-mini"
    O1_PREVIEW = "o1-preview"
    O1_MINI = "o1-mini"
    
    # Claude Models
    CLAUDE_3_5_SONNET = "claude-3-5-sonnet-20241022"
    CLAUDE_3_5_HAIKU = "claude-3-5-haiku-20241022" 
    CLAUDE_3_OPUS = "claude-3-opus-20240229"
    CLAUDE_3_SONNET = "claude-3-sonnet-20240229"
    CLAUDE_3_HAIKU = "claude-3-haiku-20240307"
    
    # Gemini Models
    GEMINI_2_0_FLASH = "gemini-2.0-flash-exp"
    GEMINI_1_5_PRO = "gemini-1.5-pro"
    GEMINI_1_5_FLASH = "gemini-1.5-flash"
    GEMINI_1_5_FLASH_8B = "gemini-1.5-flash-8b"


@dataclass
class AIConfig:
    """AI設定情報"""
    provider: AIProvider
    model: AIModel
    temperature: float = 0.7
    max_tokens: int = 2000
    top_p: float = 0.9
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            'provider': self.provider.value,
            'model': self.model.value,
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
            'top_p': self.top_p,
            'frequency_penalty': self.frequency_penalty,
            'presence_penalty': self.presence_penalty
        }


@dataclass
class ArticleTopic:
    """記事のトピック情報"""
    title: str
    coin_symbol: str
    coin_name: str
    article_type: ArticleType
    depth: ArticleDepth
    keywords: List[str]
    source_data: Optional[Dict] = None
    ai_config: Optional[AIConfig] = None


@dataclass
class GeneratedArticle:
    """生成された記事"""
    topic: ArticleTopic
    content: str
    html_content: str
    word_count: int
    generated_at: datetime.datetime
    metadata: Dict


class ArticleTemplates:
    """記事テンプレート管理"""
    
    @staticmethod
    def get_prompt_template(article_type: ArticleType, depth: ArticleDepth) -> str:
        """記事タイプと深度に応じたプロンプトテンプレートを返す"""
        
        templates = {
            ArticleType.BREAKING_NEWS: {
                ArticleDepth.SHALLOW: """
暗号通貨{coin_name}（{coin_symbol}）に関する最新ニュース記事を書いてください。

トピック: {title}
文字数: 300-500文字
スタイル: 速報形式、簡潔で要点をまとめた内容

以下の構成で書いてください：
1. 見出し（インパクトのある短いタイトル）
2. リード文（何が起きたか1-2文で説明）
3. 詳細（いつ、どこで、誰が、何を、なぜ）
4. 市場への影響（簡潔に）
5. まとめ（1文）

キーワード: {keywords}
""",
                ArticleDepth.MEDIUM: """
暗号通貨{coin_name}（{coin_symbol}）に関するニュース記事を書いてください。

トピック: {title}
文字数: 600-800文字
スタイル: ニュース記事形式、背景情報も含めた詳細な内容

以下の構成で書いてください：
1. 見出し
2. リード文（ニュースの要約）
3. 背景情報
4. 詳細な内容
5. 専門家の見解や市場の反応
6. 今後の展望
7. まとめ

キーワード: {keywords}
"""
            },
            ArticleType.PRICE_ANALYSIS: {
                ArticleDepth.SHALLOW: """
{coin_name}（{coin_symbol}）の価格分析記事を書いてください。

トピック: {title}
文字数: 400-600文字
スタイル: 簡潔な価格レポート

以下の構成で書いてください：
1. 見出し（現在の価格動向を示す）
2. 現在の価格と24時間の変動
3. 主要なサポート・レジスタンスレベル
4. 短期的な見通し
5. 注意点

キーワード: {keywords}
""",
                ArticleDepth.DEEP: """
{coin_name}（{coin_symbol}）の詳細な価格分析記事を書いてください。

トピック: {title}
文字数: 1000-1500文字
スタイル: テクニカル分析を含む詳細レポート

以下の構成で書いてください：
1. 見出し
2. エグゼクティブサマリー
3. 価格動向の詳細分析
4. テクニカル指標の分析（RSI、MACD、移動平均線など）
5. オンチェーンデータの分析
6. マーケットセンチメント
7. リスク要因
8. 短期・中期・長期予測
9. 投資判断の注意事項

キーワード: {keywords}
"""
            },
            ArticleType.EDUCATIONAL: {
                ArticleDepth.MEDIUM: """
{coin_name}（{coin_symbol}）に関する教育的な記事を書いてください。

トピック: {title}
文字数: 800-1000文字
スタイル: 初心者にも分かりやすい解説記事

以下の構成で書いてください：
1. 見出し（疑問形や「〜とは」形式）
2. 導入（なぜこの知識が重要か）
3. 基本概念の説明
4. 具体例やユースケース
5. メリットとデメリット
6. 実践的なアドバイス
7. まとめと次のステップ

キーワード: {keywords}
"""
            }
        }
        
        # デフォルトテンプレート
        default_template = """
{coin_name}（{coin_symbol}）に関する記事を書いてください。

トピック: {title}
文字数: 600-800文字
キーワード: {keywords}

読者に価値のある情報を提供する記事を作成してください。
"""
        
        return templates.get(article_type, {}).get(depth, default_template)


class LLMClient:
    """LLM API クライアント（OpenAI/Claude/Gemini対応・2025年版）"""
    
    def __init__(self, ai_config: Optional[AIConfig] = None):
        self.ai_config = ai_config or AIConfig(
            provider=AIProvider.OPENAI,
            model=AIModel.GPT_4O,
            temperature=0.7,
            max_tokens=2000
        )
        
        # APIキーを環境変数から取得
        self.api_keys = {
            AIProvider.OPENAI: os.getenv("OPENAI_API_KEY"),
            AIProvider.CLAUDE: os.getenv("CLAUDE_API_KEY"),  # 正式には ANTHROPIC_API_KEY
            AIProvider.GEMINI: os.getenv("GEMINI_API_KEY")
        }
        
        current_key = self.api_keys.get(self.ai_config.provider)
        if not current_key:
            raise ValueError(f"{self.ai_config.provider.value} API key not found in environment variables")
    
    def generate_article(self, prompt: str) -> str:
        """記事を生成（プロバイダー別）"""
        if self.ai_config.provider == AIProvider.OPENAI:
            return self._generate_with_openai(prompt)
        elif self.ai_config.provider == AIProvider.CLAUDE:
            return self._generate_with_claude(prompt)
        elif self.ai_config.provider == AIProvider.GEMINI:
            return self._generate_with_gemini(prompt)
        else:
            raise ValueError(f"Unsupported provider: {self.ai_config.provider}")
    
    def _generate_with_openai(self, prompt: str) -> str:
        """OpenAI APIを使用して生成（2025年版モデル対応）"""
        headers = {
            "Authorization": f"Bearer {self.api_keys[AIProvider.OPENAI]}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": self.ai_config.model.value,
            "messages": [
                {"role": "system", "content": "あなたは暗号通貨の専門ライターです。正確で読みやすい記事を日本語で書いてください。"},
                {"role": "user", "content": prompt}
            ],
            "temperature": self.ai_config.temperature,
            "max_tokens": self.ai_config.max_tokens,
            "top_p": self.ai_config.top_p,
            "frequency_penalty": self.ai_config.frequency_penalty,
            "presence_penalty": self.ai_config.presence_penalty
        }
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=60
        )
        
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]
        else:
            raise Exception(f"OpenAI API error: {response.status_code} - {response.text}")
    
    def _generate_with_claude(self, prompt: str) -> str:
        """Claude APIを使用して生成（2025年版）"""
        headers = {
            "x-api-key": self.api_keys[AIProvider.CLAUDE],
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        data = {
            "model": self.ai_config.model.value,
            "max_tokens": self.ai_config.max_tokens,
            "temperature": self.ai_config.temperature,
            "top_p": self.ai_config.top_p,
            "messages": [
                {
                    "role": "user", 
                    "content": f"あなたは暗号通貨の専門ライターです。正確で読みやすい記事を日本語で書いてください。\n\n{prompt}"
                }
            ]
        }
        
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=data,
            timeout=60
        )
        
        if response.status_code == 200:
            return response.json()["content"][0]["text"]
        else:
            raise Exception(f"Claude API error: {response.status_code} - {response.text}")
    
    def _generate_with_gemini(self, prompt: str) -> str:
        """Gemini APIを使用して生成（2025年版）"""
        api_key = self.api_keys[AIProvider.GEMINI]
        
        headers = {
            "Content-Type": "application/json"
        }
        
        data = {
            "contents": [{
                "parts": [{
                    "text": f"あなたは暗号通貨の専門ライターです。正確で読みやすい記事を日本語で書いてください。\n\n{prompt}"
                }]
            }],
            "generationConfig": {
                "temperature": self.ai_config.temperature,
                "topP": self.ai_config.top_p,
                "maxOutputTokens": self.ai_config.max_tokens,
            }
        }
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.ai_config.model.value}:generateContent?key={api_key}"
        
        response = requests.post(url, headers=headers, json=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            return result["candidates"][0]["content"]["parts"][0]["text"]
        else:
            raise Exception(f"Gemini API error: {response.status_code} - {response.text}")
    
    @staticmethod
    def get_available_models(provider: AIProvider) -> List[AIModel]:
        """プロバイダー別の利用可能モデル一覧を取得"""
        model_mapping = {
            AIProvider.OPENAI: [
                AIModel.GPT_4_TURBO, AIModel.GPT_4O, AIModel.GPT_4O_MINI,
                AIModel.O1_PREVIEW, AIModel.O1_MINI
            ],
            AIProvider.CLAUDE: [
                AIModel.CLAUDE_3_5_SONNET, AIModel.CLAUDE_3_5_HAIKU,
                AIModel.CLAUDE_3_OPUS, AIModel.CLAUDE_3_SONNET, AIModel.CLAUDE_3_HAIKU
            ],
            AIProvider.GEMINI: [
                AIModel.GEMINI_2_0_FLASH, AIModel.GEMINI_1_5_PRO,
                AIModel.GEMINI_1_5_FLASH, AIModel.GEMINI_1_5_FLASH_8B
            ]
        }
        return model_mapping.get(provider, [])


class HTMLFormatter:
    """記事をHTML形式に変換"""
    
    @staticmethod
    def format_article(content: str, article_type: ArticleType) -> str:
        """プレーンテキストをWordPress用HTMLに変換"""
        
        # 基本的な段落分割
        paragraphs = content.strip().split('\n\n')
        html_parts = []
        
        for i, paragraph in enumerate(paragraphs):
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            
            # 最初の段落を見出しとして扱う
            if i == 0:
                html_parts.append(f"<h1>{paragraph}</h1>")
            # 番号付きリストの検出
            elif paragraph.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.')):
                # リスト項目を処理
                list_items = paragraph.split('\n')
                html_parts.append("<ol>")
                for item in list_items:
                    # 番号を削除してリスト項目として追加
                    clean_item = item.split('.', 1)[1].strip() if '.' in item else item
                    html_parts.append(f"  <li>{clean_item}</li>")
                html_parts.append("</ol>")
            # 箇条書きの検出
            elif paragraph.startswith(('・', '•', '-')):
                list_items = paragraph.split('\n')
                html_parts.append("<ul>")
                for item in list_items:
                    clean_item = item[1:].strip()
                    html_parts.append(f"  <li>{clean_item}</li>")
                html_parts.append("</ul>")
            # サブ見出しの検出（「##」や特定のパターン）
            elif paragraph.startswith('##'):
                heading = paragraph.replace('##', '').strip()
                html_parts.append(f"<h2>{heading}</h2>")
            # 通常の段落
            else:
                # 強調表示の変換
                paragraph = paragraph.replace('**', '<strong>').replace('**', '</strong>')
                html_parts.append(f"<p>{paragraph}</p>")
        
        # 記事タイプに応じた追加フォーマット
        if article_type in [ArticleType.PRICE_ANALYSIS, ArticleType.TECHNICAL_ANALYSIS]:
            # 免責事項を追加
            html_parts.append('<hr>')
            html_parts.append('<p><em>注意：この記事は情報提供のみを目的としており、投資アドバイスではありません。暗号通貨への投資にはリスクが伴います。</em></p>')
        
        return '\n'.join(html_parts)


class CryptoArticleGenerator:
    """記事生成システムのメインクラス（2025年版・多AI対応）"""
    
    def __init__(self, ai_config: Optional[AIConfig] = None):
        self.ai_config = ai_config or AIConfig(
            provider=AIProvider.OPENAI,
            model=AIModel.GPT_4O,
            temperature=0.7,
            max_tokens=2000
        )
        self.llm_client = LLMClient(self.ai_config)
        self.templates = ArticleTemplates()
        self.formatter = HTMLFormatter()
    
    def generate_article(self, topic: ArticleTopic) -> GeneratedArticle:
        """記事を生成（AI設定に対応）"""
        
        # トピック固有のAI設定があれば使用、なければデフォルト設定
        active_ai_config = topic.ai_config or self.ai_config
        
        # 設定が変更されている場合はLLMクライアントを更新
        if topic.ai_config and topic.ai_config != self.ai_config:
            llm_client = LLMClient(topic.ai_config)
        else:
            llm_client = self.llm_client
        
        # プロンプトテンプレートを取得
        prompt_template = self.templates.get_prompt_template(
            topic.article_type, 
            topic.depth
        )
        
        # プロンプトを生成
        prompt = prompt_template.format(
            coin_name=topic.coin_name,
            coin_symbol=topic.coin_symbol,
            title=topic.title,
            keywords=", ".join(topic.keywords)
        )
        
        # LLMで記事を生成
        print(f"記事を生成中: {topic.title} (使用AI: {active_ai_config.provider.value}/{active_ai_config.model.value})")
        content = llm_client.generate_article(prompt)
        
        # HTML形式に変換
        html_content = self.formatter.format_article(content, topic.article_type)
        
        # 文字数をカウント
        word_count = len(content)
        
        # 記事オブジェクトを作成
        article = GeneratedArticle(
            topic=topic,
            content=content,
            html_content=html_content,
            word_count=word_count,
            generated_at=datetime.datetime.now(),
            metadata={
                "ai_provider": active_ai_config.provider.value,
                "ai_model": active_ai_config.model.value,
                "ai_config": active_ai_config.to_dict(),
                "prompt_length": len(prompt)
            }
        )
        
        return article
    
    def save_article(self, article: GeneratedArticle, output_dir: str = "./output"):
        """記事をファイルに保存"""
        
        # 出力ディレクトリを作成
        os.makedirs(output_dir, exist_ok=True)
        
        # ファイル名を生成
        timestamp = article.generated_at.strftime("%Y%m%d_%H%M%S")
        filename_base = f"{timestamp}_{article.topic.coin_symbol}_{article.topic.article_type.value}"
        
        # プレーンテキストを保存
        with open(f"{output_dir}/{filename_base}.txt", "w", encoding="utf-8") as f:
            f.write(article.content)
        
        # HTMLを保存
        with open(f"{output_dir}/{filename_base}.html", "w", encoding="utf-8") as f:
            f.write(article.html_content)
        
        # メタデータを保存
        metadata = {
            "topic": {
                "title": article.topic.title,
                "coin_symbol": article.topic.coin_symbol,
                "coin_name": article.topic.coin_name,
                "article_type": article.topic.article_type.value,
                "depth": article.topic.depth.value,
                "keywords": article.topic.keywords
            },
            "word_count": article.word_count,
            "generated_at": article.generated_at.isoformat(),
            "metadata": article.metadata
        }
        
        with open(f"{output_dir}/{filename_base}_metadata.json", "w", encoding="utf-8") as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        print(f"記事を保存しました: {output_dir}/{filename_base}")


def main():
    """テスト実行"""
    
    # サンプルトピック
    sample_topics = [
        ArticleTopic(
            title="ビットコインが過去最高値を更新、機関投資家の参入が加速",
            coin_symbol="BTC",
            coin_name="ビットコイン",
            article_type=ArticleType.BREAKING_NEWS,
            depth=ArticleDepth.MEDIUM,
            keywords=["ビットコイン", "最高値", "機関投資家", "ETF"]
        ),
        ArticleTopic(
            title="イーサリアムの価格分析：重要なサポートレベルでの攻防",
            coin_symbol="ETH",
            coin_name="イーサリアム",
            article_type=ArticleType.PRICE_ANALYSIS,
            depth=ArticleDepth.DEEP,
            keywords=["イーサリアム", "価格分析", "テクニカル分析", "サポートレベル"]
        ),
        ArticleTopic(
            title="DeFiとは何か？分散型金融の基礎知識",
            coin_symbol="DEFI",
            coin_name="DeFi",
            article_type=ArticleType.EDUCATIONAL,
            depth=ArticleDepth.MEDIUM,
            keywords=["DeFi", "分散型金融", "初心者向け", "ブロックチェーン"]
        )
    ]
    
    # 記事生成器を初期化
    generator = CryptoArticleGenerator(llm_provider="openai")
    
    # 各トピックについて記事を生成
    for topic in sample_topics:
        try:
            article = generator.generate_article(topic)
            generator.save_article(article)
            print(f"✓ 記事生成完了: {topic.title} ({article.word_count}文字)")
            print("-" * 50)
        except Exception as e:
            print(f"✗ エラー: {topic.title} - {str(e)}")


if __name__ == "__main__":
    main()