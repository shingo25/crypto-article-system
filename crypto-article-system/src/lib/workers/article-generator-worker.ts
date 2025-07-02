import { Job } from 'bullmq'
import { createWorker, JobData, JobResult, JobType } from '../queue'
import { createComponentLogger } from '../simple-logger'
// import { redisCache } from '../redis'
import { AppError, ErrorType } from '../error-handler'

const componentLogger = createComponentLogger('ArticleGeneratorWorker')

// 記事生成ワーカーの実装
export async function processArticleGeneration(
  job: Job<JobData[JobType.GENERATE_ARTICLE]>
): Promise<JobResult> {
  const { topicId, userId, templateId, options } = job.data
  const startTime = Date.now()

  try {
    componentLogger.info('記事生成ジョブを開始', {
      topicId,
      userId,
      templateId,
      options
    })

    // 進捗を0%に設定
    await job.updateProgress(0)

    // 1. トピック情報を取得
    componentLogger.info('トピック情報を取得中', { topicId })
    const topic = await fetchTopicData(topicId)
    if (!topic) {
      throw new AppError('Topic not found', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'TOPIC_NOT_FOUND',
        statusCode: 404,
        context: { topicId }
      })
    }

    await job.updateProgress(20)

    // 2. 記事テンプレートを取得（指定されている場合）
    let template = null
    if (templateId) {
      componentLogger.info('記事テンプレートを取得中', { templateId })
      template = await fetchTemplate(templateId)
    }

    await job.updateProgress(30)

    // 3. 市場データを取得
    componentLogger.info('市場データを取得中')
    const marketData = await fetchMarketData(topic.symbols || [])

    await job.updateProgress(50)

    // 4. AI を使用して記事を生成
    componentLogger.info('AI記事生成を開始')
    const articleContent = await generateArticleWithAI({
      topic,
      template,
      marketData,
      options: {
        wordCount: options?.wordCount || 800,
        depth: options?.depth || 'medium',
        tone: options?.tone || 'neutral'
      }
    })

    await job.updateProgress(80)

    // 5. 記事を保存
    componentLogger.info('記事をデータベースに保存中')
    const savedArticle = await saveArticle({
      topicId,
      userId,
      templateId,
      content: articleContent,
      status: 'draft',
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        options
      }
    })

    await job.updateProgress(90)

    // 6. キャッシュを更新
    componentLogger.info('キャッシュを更新中')
    await updateArticleCache(savedArticle.id, savedArticle)

    await job.updateProgress(100)

    const duration = Date.now() - startTime
    componentLogger.business('記事生成完了', {
      articleId: savedArticle.id,
      topicId,
      userId,
      duration,
      wordCount: articleContent.content.length
    })

    return {
      success: true,
      data: {
        articleId: savedArticle.id,
        title: savedArticle.title,
        wordCount: articleContent.content.length,
        processingTime: duration
      }
    }

  } catch (error) {
    const duration = Date.now() - startTime
    componentLogger.error('記事生成に失敗', error as Error, {
      topicId,
      userId,
      templateId,
      duration
    })

    return {
      success: false,
      error: (error as Error).message,
      metadata: {
        duration,
        timestamp: new Date().toISOString(),
        worker: 'article-generator'
      }
    }
  }
}

// ヘルパー関数

async function fetchTopicData(topicId: string): Promise<any> {
  // キャッシュをチェック
  const cached = await redisCache.get(`topic:${topicId}`)
  if (cached) {
    componentLogger.debug('トピックデータをキャッシュから取得', { topicId })
    return cached
  }

  // データベースから取得（実際のDBクエリが必要）
  // 仮の実装
  const topic = {
    id: topicId,
    title: 'Sample Crypto Topic',
    summary: 'This is a sample crypto topic for testing',
    symbols: ['BTC', 'ETH'],
    sources: ['coindesk', 'cointelegraph'],
    createdAt: new Date().toISOString()
  }

  // キャッシュに保存（1時間）
  await redisCache.set(`topic:${topicId}`, topic, 3600)
  
  return topic
}

async function fetchTemplate(templateId: string): Promise<any> {
  const cached = await redisCache.get(`template:${templateId}`)
  if (cached) {
    return cached
  }

  // 仮のテンプレートデータ
  const template = {
    id: templateId,
    name: 'Basic Crypto Article',
    structure: {
      sections: [
        { type: 'introduction', minWords: 100 },
        { type: 'market_analysis', minWords: 200 },
        { type: 'technical_analysis', minWords: 200 },
        { type: 'conclusion', minWords: 100 }
      ]
    }
  }

  await redisCache.set(`template:${templateId}`, template, 3600)
  return template
}

async function fetchMarketData(symbols: string[]): Promise<any> {
  if (symbols.length === 0) return {}

  try {
    // 市場データAPI呼び出し（仮の実装）
    const marketData: Record<string, any> = {}
    
    for (const symbol of symbols) {
      const cached = await redisCache.get(`market:${symbol}`)
      if (cached) {
        marketData[symbol] = cached
        continue
      }

      // 実際のAPI呼び出し（CoinGecko等）
      const data = {
        symbol,
        price: Math.random() * 50000,
        change24h: (Math.random() - 0.5) * 10,
        volume: Math.random() * 1000000000,
        marketCap: Math.random() * 1000000000000,
        lastUpdated: new Date().toISOString()
      }

      marketData[symbol] = data
      await redisCache.set(`market:${symbol}`, data, 300) // 5分キャッシュ
    }

    return marketData
  } catch (error) {
    componentLogger.error('市場データの取得に失敗', error as Error, { symbols })
    return {}
  }
}

async function generateArticleWithAI(params: {
  topic: any
  template: any | null
  marketData: any
  options: {
    wordCount: number
    depth: string
    tone: string
  }
}): Promise<{ title: string; content: string; excerpt: string }> {
  const { topic, template, marketData, options } = params

  try {
    // AI API呼び出し（OpenAI、Claude等）の仮実装
    // 実際の実装では、APIキーとモデル選択が必要

    const prompt = buildArticlePrompt(topic, template, marketData, options)
    
    // 仮の記事生成（実際のAI API呼び出しに置き換える）
    const generatedContent = {
      title: `${topic.title} - 最新分析レポート`,
      content: `
# ${topic.title}

## はじめに
${topic.summary}

## 市場分析
${Object.entries(marketData).map(([symbol, data]: [string, any]) => 
  `${symbol}: $${data.price.toFixed(2)} (${data.change24h > 0 ? '+' : ''}${data.change24h.toFixed(2)}%)`
).join('\n')}

## テクニカル分析
現在の市場動向を分析すると、重要なポイントがいくつか見えてきます。

## まとめ
本分析により、今後の展望について重要な示唆が得られました。
      `.trim(),
      excerpt: `${topic.title}に関する最新の市場分析と展望をお届けします。`
    }

    componentLogger.info('AI記事生成完了', {
      topicId: topic.id,
      wordCount: generatedContent.content.length,
      options
    })

    return generatedContent
  } catch (error) {
    componentLogger.error('AI記事生成に失敗', error as Error, { topic: topic.id })
    throw new AppError('AI article generation failed', {
      type: ErrorType.EXTERNAL_SERVICE_ERROR,
      code: 'AI_GENERATION_FAILED',
      statusCode: 502,
      context: { topicId: topic.id }
    })
  }
}

function buildArticlePrompt(topic: any, template: any, marketData: any, options: any): string {
  // AI用のプロンプトを構築
  let prompt = `Write a ${options.wordCount}-word cryptocurrency article about "${topic.title}".`
  
  if (options.depth === 'deep') {
    prompt += ' Provide detailed technical and fundamental analysis.'
  } else if (options.depth === 'shallow') {
    prompt += ' Focus on key highlights and basic information.'
  }

  if (Object.keys(marketData).length > 0) {
    prompt += '\n\nCurrent market data:\n'
    Object.entries(marketData).forEach(([symbol, data]: [string, any]) => {
      prompt += `${symbol}: $${data.price.toFixed(2)} (${data.change24h > 0 ? '+' : ''}${data.change24h.toFixed(2)}%)\n`
    })
  }

  if (template?.structure) {
    prompt += '\n\nStructure the article with these sections:\n'
    template.structure.sections.forEach((section: any) => {
      prompt += `- ${section.type} (minimum ${section.minWords} words)\n`
    })
  }

  prompt += `\n\nTone: ${options.tone}\nLanguage: Japanese`

  return prompt
}

async function saveArticle(params: {
  topicId: string
  userId?: string
  templateId?: string
  content: { title: string; content: string; excerpt: string }
  status: string
  metadata: any
}): Promise<{ id: string; title: string; status: string }> {
  // データベース保存の仮実装
  const articleId = `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const article = {
    id: articleId,
    topicId: params.topicId,
    userId: params.userId,
    templateId: params.templateId,
    title: params.content.title,
    content: params.content.content,
    excerpt: params.content.excerpt,
    status: params.status,
    metadata: params.metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  // 実際のDB保存をここで実行
  // await database.articles.create(article)

  componentLogger.info('記事を保存しました', {
    articleId,
    topicId: params.topicId,
    title: params.content.title
  })

  return {
    id: articleId,
    title: params.content.title,
    status: params.status
  }
}

async function updateArticleCache(articleId: string, article: any): Promise<void> {
  await redisCache.set(`article:${articleId}`, article, 3600)
  
  // 最新記事リストも更新
  const recentArticles = await redisCache.get('articles:recent') || []
  recentArticles.unshift(article)
  if (recentArticles.length > 50) {
    recentArticles.splice(50)
  }
  await redisCache.set('articles:recent', recentArticles, 1800)
}

// ワーカーを作成
export function createArticleGeneratorWorker() {
  return createWorker('article-generation', processArticleGeneration, {
    concurrency: 2, // 同時処理数を制限
    limiter: {
      max: 5, // 5ジョブ/分
      duration: 60000
    }
  })
}

// ワーカーを開始
if (require.main === module) {
  componentLogger.info('記事生成ワーカーを開始')
  const worker = createArticleGeneratorWorker()
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    componentLogger.info('SIGTERM received, shutting down gracefully')
    await worker.close()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    componentLogger.info('SIGINT received, shutting down gracefully')
    await worker.close()
    process.exit(0)
  })
}