// import { Job } from 'bullmq'
// import { createWorker, JobData, JobResult, JobType } from '../queue'
import { createComponentLogger } from '../simple-logger'
// import { redisCache } from '../redis'
import { AppError, ErrorType, withRetry } from '../error-handler'

const componentLogger = createComponentLogger('TopicCollectorWorker')

// RSS/ニュースソースの定義
interface NewsSource {
  id: string
  name: string
  url: string
  type: 'rss' | 'api' | 'scraper'
  enabled: boolean
  config?: Record<string, any>
}

const DEFAULT_SOURCES: NewsSource[] = [
  {
    id: 'coindesk',
    name: 'CoinDesk',
    url: 'https://feeds.feedburner.com/CoinDesk',
    type: 'rss',
    enabled: true
  },
  {
    id: 'cointelegraph',
    name: 'Cointelegraph',
    url: 'https://cointelegraph.com/rss',
    type: 'rss',
    enabled: true
  },
  {
    id: 'cryptonews',
    name: 'CryptoNews',
    url: 'https://cryptonews.com/news/feed/',
    type: 'rss',
    enabled: true
  },
  {
    id: 'coingecko_trending',
    name: 'CoinGecko Trending',
    url: 'https://api.coingecko.com/api/v3/search/trending',
    type: 'api',
    enabled: true
  }
]

// トピック収集ワーカーの実装
export async function processTopicCollection(
  job: Job<JobData[JobType.COLLECT_TOPICS]>
): Promise<JobResult> {
  const { sources, limit = 50, keywords = [] } = job.data
  const startTime = Date.now()

  try {
    componentLogger.info('トピック収集ジョブを開始', {
      sources,
      limit,
      keywords
    })

    await job.updateProgress(0)

    // 1. ソース設定を取得
    const sourcesToProcess = await getEnabledSources(sources)
    componentLogger.info('処理対象ソース', { 
      count: sourcesToProcess.length,
      sources: sourcesToProcess.map(s => s.name)
    })

    if (sourcesToProcess.length === 0) {
      throw new AppError('No enabled sources found', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'NO_SOURCES',
        statusCode: 400
      })
    }

    await job.updateProgress(10)

    // 2. 各ソースから並行してデータを収集
    const collectedTopics: any[] = []
    const sourcePromises = sourcesToProcess.map(async (source, index) => {
      try {
        const topics = await collectFromSource(source, keywords)
        collectedTopics.push(...topics)
        
        // 進捗更新（10% + 各ソースで70%のうちの分担）
        const progress = 10 + (index + 1) * (70 / sourcesToProcess.length)
        await job.updateProgress(progress)
        
        return topics
      } catch (error) {
        componentLogger.error(`ソース ${source.name} からの収集に失敗`, error as Error)
        return []
      }
    })

    await Promise.all(sourcePromises)

    await job.updateProgress(80)

    // 3. トピックを処理・正規化
    componentLogger.info('収集したトピックを処理中', { count: collectedTopics.length })
    const processedTopics = await processAndDeduplicateTopics(collectedTopics, keywords)

    await job.updateProgress(90)

    // 4. 上限を適用
    const finalTopics = processedTopics.slice(0, limit)

    // 5. データベースに保存
    componentLogger.info('トピックをデータベースに保存中', { count: finalTopics.length })
    const savedTopics = await saveTopics(finalTopics)

    await job.updateProgress(95)

    // 6. キャッシュを更新
    await updateTopicsCache(savedTopics)

    await job.updateProgress(100)

    const duration = Date.now() - startTime
    componentLogger.business('トピック収集完了', {
      sourcesCount: sourcesToProcess.length,
      collectedCount: collectedTopics.length,
      processedCount: processedTopics.length,
      savedCount: savedTopics.length,
      duration,
      keywords
    })

    return {
      success: true,
      data: {
        topicsCollected: collectedTopics.length,
        topicsProcessed: processedTopics.length,
        topicsSaved: savedTopics.length,
        sources: sourcesToProcess.map(s => s.name),
        processingTime: duration
      }
    }

  } catch (error) {
    const duration = Date.now() - startTime
    componentLogger.error('トピック収集に失敗', error as Error, {
      sources,
      limit,
      keywords,
      duration
    })

    return {
      success: false,
      error: (error as Error).message,
      metadata: {
        duration,
        timestamp: new Date().toISOString(),
        worker: 'topic-collector'
      }
    }
  }
}

// ヘルパー関数

async function getEnabledSources(requestedSources?: string[]): Promise<NewsSource[]> {
  // キャッシュから設定を取得
  let sources = await redisCache.get<NewsSource[]>('config:news_sources')
  
  if (!sources) {
    // デフォルトソースを使用
    sources = DEFAULT_SOURCES
    await redisCache.set('config:news_sources', sources, 3600)
  }

  // 有効なソースのみフィルタ
  let enabledSources = sources.filter(s => s.enabled)

  // 特定のソースが指定されている場合はそれに限定
  if (requestedSources && requestedSources.length > 0) {
    enabledSources = enabledSources.filter(s => requestedSources.includes(s.id))
  }

  return enabledSources
}

async function collectFromSource(source: NewsSource, keywords: string[]): Promise<any[]> {
  const cacheKey = `topics:${source.id}:${Date.now() - (Date.now() % (5 * 60 * 1000))}` // 5分間隔
  
  // キャッシュチェック
  const cached = await redisCache.get(cacheKey)
  if (cached) {
    componentLogger.debug(`ソース ${source.name} のキャッシュを使用`)
    return cached
  }

  try {
    let topics: any[] = []

    switch (source.type) {
      case 'rss':
        topics = await collectFromRSS(source)
        break
      case 'api':
        topics = await collectFromAPI(source)
        break
      case 'scraper':
        topics = await collectFromScraper(source)
        break
      default:
        componentLogger.warn(`未対応のソースタイプ: ${source.type}`)
        return []
    }

    // キーワードフィルタリング
    if (keywords.length > 0) {
      topics = filterByKeywords(topics, keywords)
    }

    // キャッシュに保存（5分間）
    await redisCache.set(cacheKey, topics, 300)

    componentLogger.info(`ソース ${source.name} から収集完了`, { 
      count: topics.length,
      type: source.type
    })

    return topics
  } catch (error) {
    componentLogger.error(`ソース ${source.name} からの収集に失敗`, error as Error)
    throw error
  }
}

async function collectFromRSS(source: NewsSource): Promise<any[]> {
  return withRetry(async () => {
    // RSS解析ライブラリを使用（例：node-feedparser）
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'CryptoArticleSystem/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10秒タイムアウト
    })

    if (!response.ok) {
      throw new AppError(`RSS fetch failed: ${response.statusText}`, {
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        statusCode: response.status,
        context: { source: source.name, url: source.url }
      })
    }

    const rssText = await response.text()
    
    // 簡易RSS解析（実際の実装では専用ライブラリを使用）
    const topics = parseRSSContent(rssText, source)
    
    return topics
  }, 3, 2000, { source: source.name })
}

async function collectFromAPI(source: NewsSource): Promise<any[]> {
  return withRetry(async () => {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'CryptoArticleSystem/1.0',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      throw new AppError(`API fetch failed: ${response.statusText}`, {
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        statusCode: response.status,
        context: { source: source.name, url: source.url }
      })
    }

    const data = await response.json()
    
    // API特有の処理
    if (source.id === 'coingecko_trending') {
      return processCoinGeckoTrending(data)
    }

    return data.items || data.articles || []
  }, 3, 2000, { source: source.name })
}

async function collectFromScraper(source: NewsSource): Promise<any[]> {
  // スクレーピング実装（Puppeteer等を使用）
  componentLogger.warn('スクレーピング機能は未実装', { source: source.name })
  return []
}

function parseRSSContent(rssText: string, source: NewsSource): any[] {
  // 簡易RSS解析（実際はfeedparserやxml2js等を使用）
  const topics: any[] = []
  
  try {
    // XMLを正規表現で解析（本格的な実装ではXMLパーサーを使用）
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    const items = rssText.match(itemRegex) || []

    for (const item of items) {
      const title = extractXMLValue(item, 'title')
      const description = extractXMLValue(item, 'description')
      const link = extractXMLValue(item, 'link')
      const pubDate = extractXMLValue(item, 'pubDate')

      if (title && link) {
        topics.push({
          title,
          description: description || '',
          url: link,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          source: source.name,
          sourceId: source.id,
          type: 'news'
        })
      }
    }
  } catch (error) {
    componentLogger.error('RSS解析エラー', error as Error, { source: source.name })
  }

  return topics
}

function extractXMLValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : ''
}

function processCoinGeckoTrending(data: any): any[] {
  if (!data.coins) return []

  return data.coins.map((coin: any) => ({
    title: `${coin.item.name} (${coin.item.symbol}) がトレンド入り`,
    description: `${coin.item.name}が現在トレンドランキング${coin.item.market_cap_rank || 'N/A'}位にランクイン`,
    url: `https://coingecko.com/coins/${coin.item.id}`,
    publishedAt: new Date().toISOString(),
    source: 'CoinGecko',
    sourceId: 'coingecko_trending',
    type: 'trending',
    metadata: {
      symbol: coin.item.symbol,
      marketCapRank: coin.item.market_cap_rank,
      coinId: coin.item.id
    }
  }))
}

function filterByKeywords(topics: any[], keywords: string[]): any[] {
  if (keywords.length === 0) return topics

  const keywordRegex = new RegExp(keywords.join('|'), 'i')
  
  return topics.filter(topic => {
    const searchText = `${topic.title} ${topic.description}`.toLowerCase()
    return keywordRegex.test(searchText)
  })
}

async function processAndDeduplicateTopics(topics: any[], keywords: string[]): Promise<any[]> {
  const processedTopics: any[] = []
  const seenUrls = new Set<string>()
  const seenTitles = new Set<string>()

  for (const topic of topics) {
    // 重複チェック（URL）
    if (seenUrls.has(topic.url)) {
      continue
    }

    // 重複チェック（タイトル）
    const normalizedTitle = topic.title.toLowerCase().replace(/[^\w\s]/g, '')
    if (seenTitles.has(normalizedTitle)) {
      continue
    }

    // 品質チェック
    if (!isValidTopic(topic)) {
      continue
    }

    // スコア計算
    const score = calculateTopicScore(topic, keywords)

    const processedTopic = {
      ...topic,
      id: `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      score,
      processedAt: new Date().toISOString(),
      status: 'pending'
    }

    processedTopics.push(processedTopic)
    seenUrls.add(topic.url)
    seenTitles.add(normalizedTitle)
  }

  // スコア順でソート
  return processedTopics.sort((a, b) => b.score - a.score)
}

function isValidTopic(topic: any): boolean {
  // 基本的な品質チェック
  if (!topic.title || topic.title.length < 10) return false
  if (!topic.url || !topic.url.startsWith('http')) return false
  if (topic.title.length > 200) return false
  
  // スパムキーワードチェック
  const spamKeywords = ['広告', 'PR', 'sponsored', 'advertisement']
  const titleLower = topic.title.toLowerCase()
  if (spamKeywords.some(spam => titleLower.includes(spam))) return false

  return true
}

function calculateTopicScore(topic: any, keywords: string[]): number {
  let score = 50 // ベーススコア

  // キーワードマッチボーナス
  if (keywords.length > 0) {
    const keywordRegex = new RegExp(keywords.join('|'), 'i')
    const titleMatches = (topic.title.match(keywordRegex) || []).length
    const descMatches = (topic.description.match(keywordRegex) || []).length
    score += (titleMatches * 10) + (descMatches * 5)
  }

  // 新しさボーナス
  const publishedAt = new Date(topic.publishedAt)
  const hoursAgo = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60)
  if (hoursAgo < 1) score += 20
  else if (hoursAgo < 6) score += 10
  else if (hoursAgo < 24) score += 5

  // ソース信頼性ボーナス
  const trustedSources = ['coindesk', 'cointelegraph', 'coingecko_trending']
  if (trustedSources.includes(topic.sourceId)) {
    score += 15
  }

  // タイトル品質ボーナス
  if (topic.title.length > 50 && topic.title.length < 100) score += 5
  if (topic.description && topic.description.length > 100) score += 5

  return Math.max(0, Math.min(100, score))
}

async function saveTopics(topics: any[]): Promise<any[]> {
  const savedTopics: any[] = []

  for (const topic of topics) {
    try {
      // データベース保存（実際のDB実装が必要）
      // const saved = await database.topics.create(topic)
      const saved = { ...topic, savedAt: new Date().toISOString() }
      savedTopics.push(saved)
    } catch (error) {
      componentLogger.error('トピック保存エラー', error as Error, { topicId: topic.id })
    }
  }

  componentLogger.info(`${savedTopics.length}件のトピックを保存しました`)
  return savedTopics
}

async function updateTopicsCache(topics: any[]): Promise<void> {
  // 最新トピックキャッシュを更新
  await redisCache.set('topics:latest', topics, 1800) // 30分

  // カテゴリ別キャッシュ
  const byCategory: Record<string, any[]> = {}
  topics.forEach(topic => {
    const category = topic.type || 'general'
    if (!byCategory[category]) byCategory[category] = []
    byCategory[category].push(topic)
  })

  for (const [category, categoryTopics] of Object.entries(byCategory)) {
    await redisCache.set(`topics:category:${category}`, categoryTopics, 1800)
  }

  componentLogger.debug('トピックキャッシュを更新しました', {
    totalTopics: topics.length,
    categories: Object.keys(byCategory)
  })
}

// ワーカーを作成
export function createTopicCollectorWorker() {
  return createWorker('topic-collection', processTopicCollection, {
    concurrency: 1, // トピック収集は1つずつ実行
    limiter: {
      max: 1, // 1ジョブ/分（外部APIの制限を考慮）
      duration: 60000
    }
  })
}

// ワーカーを開始
if (require.main === module) {
  componentLogger.info('トピック収集ワーカーを開始')
  const worker = createTopicCollectorWorker()
  
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