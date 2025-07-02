import { Topic, Article } from '@/lib/stores/workspaceStore'

export const mockTopics: Topic[] = [
  {
    id: '1',
    coins: ['BTC', 'ETH'],
    summary: 'ビットコインとイーサリアムの最新価格動向と市場分析',
    timestamp: new Date().toISOString(),
    status: 'active',
    priority: 'high',
    tags: ['価格分析', '市場動向', 'DeFi']
  },
  {
    id: '2',
    coins: ['SOL'],
    summary: 'Solanaエコシステムの成長とNFT市場への影響',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    status: 'active',
    priority: 'medium',
    tags: ['NFT', 'エコシステム', 'Layer1']
  },
  {
    id: '3',
    coins: ['MATIC', 'ARB'],
    summary: 'Layer2ソリューションの比較：PolygonとArbitrum',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    status: 'active',
    priority: 'medium',
    tags: ['Layer2', 'スケーリング', '比較分析']
  },
  {
    id: '4',
    coins: ['LINK', 'API3'],
    summary: 'オラクルソリューションの現状と将来性',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    status: 'pending',
    priority: 'low',
    tags: ['オラクル', 'DeFi', 'インフラ']
  },
  {
    id: '5',
    coins: ['UNI', 'SUSHI'],
    summary: 'DEX市場の競争激化：UniswapとSushiSwapの戦略',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    status: 'active',
    priority: 'high',
    tags: ['DEX', 'DeFi', '流動性']
  }
]

export const mockArticle: Article = {
  id: 'article-1',
  topicId: '1',
  title: 'ビットコインとイーサリアムの最新価格動向と市場分析',
  content: `# ビットコインとイーサリアムの最新価格動向と市場分析

## 概要

2025年の暗号通貨市場は、ビットコイン（BTC）とイーサリアム（ETH）を中心に大きな変動を見せています。本記事では、最新の価格動向と市場分析をお届けします。

## ビットコインの現状

### 価格動向
- 現在価格: $45,000
- 24時間変動率: +3.5%
- 週間変動率: +8.2%

### 技術的分析
ビットコインは重要なサポートレベルである$42,000を上回って推移しており、次のレジスタンスレベルは$48,000となっています。

## イーサリアムの展望

### アップデート状況
- Shanghaiアップグレードの完了
- ステーキング報酬の引き出しが可能に
- Layer2ソリューションの採用加速

### DeFiエコシステム
イーサリアム上のDeFiプロトコルは引き続き成長を続けており、TVL（Total Value Locked）は$50B を超えています。

## 市場分析と今後の見通し

### マクロ経済要因
- 米国の金融政策の影響
- 機関投資家の参入継続
- 規制環境の整備

### 投資戦略
長期的な視点では、両通貨ともに強気の見通しが優勢です。ただし、短期的なボラティリティには注意が必要です。

## まとめ

ビットコインとイーサリアムは、暗号通貨市場の主要な推進力として機能し続けています。投資家は市場動向を注視しながら、適切なリスク管理を行うことが重要です。`,
  status: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  metadata: {
    wordCount: 450,
    readingTime: 3,
    keywords: ['ビットコイン', 'イーサリアム', 'DeFi', '市場分析'],
    seoScore: 85,
    sentiment: 'positive',
    language: 'ja',
    updatedAt: new Date().toISOString()
  }
}