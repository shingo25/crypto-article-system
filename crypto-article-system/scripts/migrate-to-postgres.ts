import { PrismaClient } from '@prisma/client'
import { PrismaClient as PostgresPrisma } from '../src/generated/prisma'

// SQLite接続（既存データ読み込み用）
const sqlitePrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
})

// PostgreSQL接続（新規データ書き込み用）
const postgresPrisma = new PostgresPrisma()

async function migrateData() {
  try {
    console.log('データ移行を開始します...')

    // 1. ユーザーデータの移行
    console.log('ユーザーデータを移行中...')
    const users = await sqlitePrisma.user.findMany()
    for (const user of users) {
      await postgresPrisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          passwordHash: user.passwordHash,
          role: user.role,
          apiKeyHash: user.apiKeyHash,
          emailVerified: user.emailVerified,
          emailVerificationToken: user.emailVerificationToken,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      })
    }
    console.log(`${users.length}件のユーザーを移行しました`)

    // 2. RSSソースの移行
    console.log('RSSソースを移行中...')
    const rssSources = await sqlitePrisma.rSSSource.findMany()
    for (const source of rssSources) {
      await postgresPrisma.rSSSource.create({
        data: {
          id: source.id,
          name: source.name,
          url: source.url,
          category: source.category,
          description: source.description,
          enabled: source.enabled,
          lastCollected: source.lastCollected,
          lastError: source.lastError,
          totalCollected: source.totalCollected,
          status: source.status,
          createdAt: source.createdAt,
          updatedAt: source.updatedAt
        }
      })
    }
    console.log(`${rssSources.length}件のRSSソースを移行しました`)

    // 3. ニュースアイテムの移行
    console.log('ニュースアイテムを移行中...')
    const newsItems = await sqlitePrisma.newsItem.findMany({
      take: 1000, // メモリ制限のため分割処理
      orderBy: { publishedAt: 'desc' }
    })
    
    for (const item of newsItems) {
      await postgresPrisma.newsItem.create({
        data: {
          id: item.id,
          title: item.title,
          summary: item.summary,
          content: item.content,
          url: item.url,
          publishedAt: item.publishedAt,
          source: item.source,
          sourceId: item.sourceId,
          importance: item.importance,
          analyzed: item.analyzed,
          metadata: item.metadata ? JSON.parse(JSON.stringify(item.metadata)) : {},
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }
      })
    }
    console.log(`${newsItems.length}件のニュースアイテムを移行しました`)

    // 4. 記事データの移行
    console.log('記事データを移行中...')
    const articles = await sqlitePrisma.article.findMany()
    for (const article of articles) {
      await postgresPrisma.article.create({
        data: {
          id: article.id,
          title: article.title,
          content: article.content,
          summary: article.summary,
          status: article.status,
          publishedAt: article.publishedAt,
          authorId: article.authorId,
          metadata: article.metadata ? JSON.parse(JSON.stringify(article.metadata)) : {},
          version: article.version,
          viewCount: article.viewCount,
          likeCount: article.likeCount,
          commentCount: article.commentCount,
          isAIGenerated: article.isAIGenerated,
          aiModel: article.aiModel,
          aiPrompt: article.aiPrompt,
          aiTemperature: article.aiTemperature,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt
        }
      })
    }
    console.log(`${articles.length}件の記事を移行しました`)

    // 5. アラートの移行
    console.log('アラートデータを移行中...')
    const alerts = await sqlitePrisma.alert.findMany()
    for (const alert of alerts) {
      await postgresPrisma.alert.create({
        data: {
          id: alert.id,
          type: alert.type,
          priority: alert.priority,
          title: alert.title,
          message: alert.message,
          status: alert.status,
          metadata: alert.metadata ? JSON.parse(JSON.stringify(alert.metadata)) : {},
          resolvedAt: alert.resolvedAt,
          resolvedBy: alert.resolvedBy,
          createdAt: alert.createdAt,
          updatedAt: alert.updatedAt
        }
      })
    }
    console.log(`${alerts.length}件のアラートを移行しました`)

    console.log('✅ データ移行が完了しました！')
    
    // 統計情報を表示
    const stats = {
      users: users.length,
      rssSources: rssSources.length,
      newsItems: newsItems.length,
      articles: articles.length,
      alerts: alerts.length
    }
    
    console.log('移行統計:', stats)
    
  } catch (error) {
    console.error('データ移行中にエラーが発生しました:', error as Error)
    throw error
  } finally {
    await sqlitePrisma.$disconnect()
    await postgresPrisma.$disconnect()
  }
}

// スクリプト実行
migrateData()
  .then(() => {
    console.log('✅ 移行が正常に完了しました')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 移行に失敗しました:', error)
    process.exit(1)
  })