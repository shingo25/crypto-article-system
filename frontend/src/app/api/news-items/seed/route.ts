import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createComponentLogger } from '@/lib/simple-logger'

const componentLogger = createComponentLogger('NewsItemsSeedAPI')

// サンプルニュースデータを作成
const sampleNewsItems = [
  {
    title: 'Bitcoin価格が再び上昇、$50,000を突破',
    summary: 'ビットコインの価格が再び上昇し、$50,000の大台を突破しました。機関投資家からの関心が高まっています。',
    content: 'ビットコインの価格が再び上昇し、$50,000の大台を突破しました。この上昇は、機関投資家からの関心の高まりと、規制環境の改善によるものと考えられています。',
    url: 'https://example.com/bitcoin-50k',
    source: 'CoinDesk',
    author: 'John Doe',
    sentiment: 0.8,
    importance: 9,
    publishedAt: new Date('2024-01-15T10:00:00Z'),
    hasGeneratedArticle: false,
  },
  {
    title: 'Ethereum 2.0アップデート完了、ガス費用が大幅に削減',
    summary: 'イーサリアム2.0の最新アップデートが完了し、ガス費用が大幅に削減されました。DeFiエコシステムに大きな影響を与えています。',
    content: 'イーサリアム2.0の最新アップデートが完了し、ガス費用が大幅に削減されました。これによりDeFiエコシステムの利用コストが大幅に下がり、より多くのユーザーが参加できるようになりました。',
    url: 'https://example.com/ethereum-2-0-update',
    source: 'CoinTelegraph',
    author: 'Jane Smith',
    sentiment: 0.9,
    importance: 8,
    publishedAt: new Date('2024-01-14T14:30:00Z'),
    hasGeneratedArticle: false,
  },
  {
    title: 'Solana開発者エコシステムが急成長、新しいDAppsが続々リリース',
    summary: 'Solanaブロックチェーンの開発者エコシステムが急成長しており、新しいDAppsが続々とリリースされています。',
    content: 'Solanaブロックチェーンの開発者エコシステムが急成長しており、新しいDAppsが続々とリリースされています。高速な処理能力と低い手数料が開発者を引き付けています。',
    url: 'https://example.com/solana-ecosystem-growth',
    source: 'The Block',
    author: 'Mike Johnson',
    sentiment: 0.7,
    importance: 7,
    publishedAt: new Date('2024-01-13T09:15:00Z'),
    hasGeneratedArticle: false,
  },
  {
    title: 'SEC、新しい暗号資産規制ガイドラインを発表',
    summary: 'SECが新しい暗号資産規制ガイドラインを発表し、業界に大きな影響を与えています。',
    content: 'SECが新しい暗号資産規制ガイドラインを発表し、業界に大きな影響を与えています。これにより、暗号資産の取引や投資に関する規制が明確になりました。',
    url: 'https://example.com/sec-crypto-guidelines',
    source: 'Coinbase Blog',
    author: 'Sarah Wilson',
    sentiment: -0.2,
    importance: 6,
    publishedAt: new Date('2024-01-12T16:45:00Z'),
    hasGeneratedArticle: false,
  },
  {
    title: 'DeFiプロトコルでハッキング被害、$10M相当の資金が流出',
    summary: 'DeFiプロトコルで大規模なハッキングが発生し、$10M相当の資金が流出しました。セキュリティ強化が急務です。',
    content: 'DeFiプロトコルで大規模なハッキングが発生し、$10M相当の資金が流出しました。スマートコントラクトの脆弱性が悪用されたとみられ、セキュリティ強化が急務となっています。',
    url: 'https://example.com/defi-hack-10m',
    source: 'CryptoSlate',
    author: 'Alex Chen',
    sentiment: -0.8,
    importance: 8,
    publishedAt: new Date('2024-01-11T11:20:00Z'),
    hasGeneratedArticle: false,
  },
  {
    title: 'NFTマーケットプレイスが新機能をリリース、アーティストの収益向上へ',
    summary: 'NFTマーケットプレイスが新機能をリリースし、アーティストの収益向上を支援しています。',
    content: 'NFTマーケットプレイスが新機能をリリースし、アーティストの収益向上を支援しています。ロイヤリティ機能の改善により、アーティストは継続的な収益を得られるようになりました。',
    url: 'https://example.com/nft-marketplace-new-features',
    source: 'NFT Now',
    author: 'Emily Davis',
    sentiment: 0.6,
    importance: 5,
    publishedAt: new Date('2024-01-10T13:00:00Z'),
    hasGeneratedArticle: false,
  }
]

export async function POST(_request: NextRequest) {
  try {
    componentLogger.info('ニュースアイテムのサンプルデータ作成開始')

    // 既存のデータを確認
    const existingCount = await prisma.newsItem.count()
    
    if (existingCount > 0) {
      componentLogger.info('既存のニュースデータが存在します', { count: existingCount })
      return NextResponse.json({
        success: true,
        message: `既存のニュースデータが${existingCount}件存在します`,
        data: { existingCount }
      })
    }

    // サンプルデータを作成
    const createdItems = []
    for (const item of sampleNewsItems) {
      try {
        const created = await prisma.newsItem.create({
          data: {
            ...item,
            guid: `sample-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          }
        })
        createdItems.push(created)
      } catch (error) {
        componentLogger.error('ニュースアイテム作成エラー', error as Error, { item: item.title })
      }
    }

    componentLogger.info('サンプルニュースデータ作成完了', { 
      createdCount: createdItems.length,
      totalCount: sampleNewsItems.length
    })

    return NextResponse.json({
      success: true,
      message: `${createdItems.length}件のサンプルニュースデータを作成しました`,
      data: {
        createdCount: createdItems.length,
        items: createdItems.map(item => ({
          id: item.id,
          title: item.title,
          source: item.source,
          importance: item.importance,
          publishedAt: item.publishedAt
        }))
      }
    })

  } catch (error) {
    componentLogger.error('サンプルデータ作成エラー', error as Error)
    
    return NextResponse.json({
      success: false,
      error: {
        message: 'サンプルデータの作成に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    }, { status: 500 })
  }
}