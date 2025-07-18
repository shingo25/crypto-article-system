const { PrismaClient } = require('./src/generated/prisma')
const prisma = new PrismaClient()

async function main() {
  try {
    // 既存のデータを削除
    await prisma.rSSSource.deleteMany()
    
    // CoinDeskを追加
    const coindesk = await prisma.rSSSource.create({
      data: {
        name: 'CoinDesk',
        url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
        category: 'news',
        description: 'Leading cryptocurrency news source',
        enabled: true,
        status: 'active'
      }
    })
    
    console.log('CoinDesk追加成功:', coindesk)

    // CoinTelegraphを追加
    const cointelegraph = await prisma.rSSSource.create({
      data: {
        name: 'CoinTelegraph',
        url: 'https://cointelegraph.com/rss',
        category: 'news', 
        description: 'Bitcoin, blockchain and cryptocurrency news',
        enabled: true,
        status: 'active'
      }
    })
    
    console.log('CoinTelegraph追加成功:', cointelegraph)

    // 全データを確認
    const allSources = await prisma.rSSSource.findMany()
    console.log('全RSSソース数:', allSources.length)

  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()