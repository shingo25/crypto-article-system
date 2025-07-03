import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'

const logger = createLogger({ component: 'SeedRSSSources' })

const defaultRSSSources = [
  {
    name: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    category: 'news',
    description: '暗号通貨業界の最新ニュースとインサイト'
  },
  {
    name: 'CoinTelegraph',
    url: 'https://cointelegraph.com/rss',
    category: 'news',
    description: 'ビットコイン、ブロックチェーン、暗号通貨の最新ニュース'
  },
  {
    name: 'CryptoSlate',
    url: 'https://cryptoslate.com/feed/',
    category: 'news',
    description: '暗号通貨ニュース、価格、データ、分析'
  },
  {
    name: 'The Block',
    url: 'https://www.theblockcrypto.com/rss.xml',
    category: 'news',
    description: '暗号通貨とブロックチェーンの詳細分析'
  },
  {
    name: 'Decrypt',
    url: 'https://decrypt.co/feed',
    category: 'news',
    description: 'ビットコイン、イーサリアム、暗号通貨ニュース'
  },
  {
    name: 'Bitcoin Magazine',
    url: 'https://bitcoinmagazine.com/feed',
    category: 'analysis',
    description: 'ビットコインに特化した詳細分析と教育コンテンツ'
  },
  {
    name: 'Messari',
    url: 'https://messari.io/rss',
    category: 'analysis',
    description: '暗号資産の研究、データ、市場インテリジェンス'
  },
  {
    name: 'Glassnode Insights',
    url: 'https://insights.glassnode.com/rss/',
    category: 'analysis',
    description: 'オンチェーンデータと市場分析'
  },
  {
    name: 'DeFi Pulse',
    url: 'https://defipulse.com/blog/feed/',
    category: 'technology',
    description: 'DeFiエコシステムの分析とトレンド'
  },
  {
    name: 'Ethereum Blog',
    url: 'https://blog.ethereum.org/feed.xml',
    category: 'technology',
    description: 'イーサリアムの公式ブログ'
  }
]

async function seedRSSSources() {
  try {
    logger.info('デフォルトRSSソースの追加を開始')

    let addedCount = 0
    let skippedCount = 0

    for (const source of defaultRSSSources) {
      try {
        // 既存チェック
        const existing = await prisma.rSSSource.findUnique({
          where: { url: source.url }
        })

        if (existing) {
          logger.info('既に存在するソースをスキップ', { name: source.name })
          skippedCount++
          continue
        }

        // 新規追加
        await prisma.rSSSource.create({
          data: {
            name: source.name,
            url: source.url,
            category: source.category,
            description: source.description,
            enabled: true,
            status: 'active'
          }
        })

        logger.info('RSSソースを追加', { name: source.name })
        addedCount++
      } catch (error) {
        logger.error('RSSソースの追加に失敗', error as Error, { name: source.name })
      }
    }

    logger.info('デフォルトRSSソースの追加が完了', {
      total: defaultRSSSources.length,
      added: addedCount,
      skipped: skippedCount
    })

    // 最初の収集を実行
    if (addedCount > 0) {
      logger.info('初回のニュース収集を開始')
      const { rssParser } = await import('@/lib/rss-parser-service')
      const result = await rssParser.collectFromAllSources()
      logger.info('初回のニュース収集が完了', result)
    }
  } catch (error) {
    logger.error('RSSソースのシードに失敗', error as Error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// スクリプトを実行
seedRSSSources()
  .then(() => {
    logger.info('✅ RSSソースのシードが完了しました')
    process.exit(0)
  })
  .catch((error) => {
    logger.error('❌ RSSソースのシードに失敗しました', error)
    process.exit(1)
  })