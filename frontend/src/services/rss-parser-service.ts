import Parser from 'rss-parser'
import { parse as parseHtml } from 'node-html-parser'
import { AppError } from '@/lib/errors'
import { PrismaClient } from '@/generated/prisma'
const prisma = new PrismaClient()
import { createLogger } from '@/lib/logger'
import { tagExtractor } from '@/lib/tag-extractor'

const logger = createLogger('RSSParserService')

interface RSSItem {
  title: string
  link: string
  pubDate?: string
  content?: string
  contentSnippet?: string
  guid?: string
  categories?: string[]
  author?: string
  enclosure?: {
    url: string
    type?: string
  }
}

interface ParsedNewsItem {
  title: string
  summary: string
  content?: string
  url: string
  imageUrl?: string
  source: string
  author?: string
  topics: string[]
  coins: string[]
  companies: string[]
  products: string[]
  technology: string[]
  market: string[]
  regulatory: string[]
  regions: string[]
  publishedAt: Date
  guid: string
}

export class RSSParserService {
  private parser: Parser

  constructor() {
    this.parser = new Parser({
      timeout: 10000, // 10秒タイムアウト
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      customFields: {
        item: [
          ['media:content', 'mediaContent'],
          ['media:thumbnail', 'mediaThumbnail'],
          ['description', 'description'],
          ['content:encoded', 'contentEncoded']
        ]
      }
    })
  }

  /**
   * URLからRSSフィードを取得してパース
   */
  async fetchAndParseFeed(url: string): Promise<ParsedNewsItem[]> {
    try {
      logger.info('RSSフィードの取得を開始', { url })
      
      const feed = await this.parser.parseURL(url)
      logger.info('RSSフィード取得成功', { 
        url, 
        title: feed.title, 
        rawItemCount: feed.items.length 
      })
      
      const items: ParsedNewsItem[] = []

      for (const item of feed.items) {
        const parsedItem = this.parseRSSItem(item as RSSItem, feed.title || 'Unknown Source')
        if (parsedItem) {
          items.push(parsedItem)
        }
      }

      logger.info('RSSフィードの解析が完了', { url, itemCount: items.length })
      return items
    } catch (error) {
      logger.error('RSSフィードの取得に失敗', error as Error, { url })
      throw new AppError('Failed to fetch RSS feed', 'RSS_FETCH_ERROR', 500, { url })
    }
  }

  /**
   * RSSアイテムをパースして共通フォーマットに変換
   */
  private parseRSSItem(item: RSSItem, sourceName: string): ParsedNewsItem | null {
    try {
      // 必須フィールドの確認
      if (!item.title || !item.link) {
        return null
      }

      // コンテンツの抽出
      const content = item.content || item.contentSnippet || ''
      const summary = this.extractSummary(content)

      // 画像URLの抽出
      const imageUrl = this.extractImageUrl(item)

      // 高度なタグ抽出
      const extractedTags = tagExtractor.extractTags(item.title, summary, content)
      
      // レガシーのトピック抽出も保持（カテゴリー情報）
      const legacyTopics = this.extractLegacyTopics(item)
      
      // 全トピックを統合
      const allTopics = [...new Set([...extractedTags.general, ...legacyTopics])]

      // 公開日時の処理
      const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date()

      // GUIDの生成
      const guid = item.guid || item.link

      return {
        title: item.title.trim(),
        summary,
        content: content || undefined,
        url: item.link,
        imageUrl,
        source: sourceName,
        author: item.author,
        topics: allTopics,
        coins: extractedTags.currencies,
        companies: extractedTags.companies,
        products: extractedTags.products,
        technology: extractedTags.technology,
        market: extractedTags.market,
        regulatory: extractedTags.regulatory,
        regions: extractedTags.regions,
        publishedAt,
        guid
      }
    } catch (error) {
      logger.warn('RSSアイテムのパースに失敗', { title: item.title, error })
      return null
    }
  }

  /**
   * コンテンツから要約を抽出
   */
  private extractSummary(content: string): string {
    if (!content) return ''

    // HTMLタグを除去
    const textContent = this.stripHtml(content)

    // 最大200文字まで
    const maxLength = 200
    if (textContent.length <= maxLength) {
      return textContent
    }

    // 文の境界で切る
    const truncated = textContent.substring(0, maxLength)
    const lastPeriod = truncated.lastIndexOf('。')
    
    if (lastPeriod > 100) {
      return truncated.substring(0, lastPeriod + 1)
    }

    return truncated + '...'
  }

  /**
   * HTMLタグを除去
   */
  private stripHtml(html: string): string {
    try {
      const root = parseHtml(html)
      return root.textContent.trim()
    } catch {
      // フォールバック: 簡易的なタグ除去
      return html.replace(/<[^>]*>/g, '').trim()
    }
  }

  /**
   * 画像URLを抽出
   */
  private extractImageUrl(item: any): string | undefined {
    // media:contentから画像を探す
    if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
      return item.mediaContent.$.url
    }

    // media:thumbnailから画像を探す
    if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) {
      return item.mediaThumbnail.$.url
    }

    // enclosureから画像を探す
    if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith('image/')) {
      return item.enclosure.url
    }

    // コンテンツ内の最初の画像を探す
    if (item.content || item.contentEncoded) {
      const content = item.content || item.contentEncoded
      const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i)
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1]
      }
    }

    return undefined
  }

  /**
   * レガシーのトピック抽出（カテゴリーベース）
   */
  private extractLegacyTopics(item: RSSItem): string[] {
    const topics: string[] = []

    // RSSカテゴリーから
    if (item.categories && Array.isArray(item.categories)) {
      topics.push(...item.categories)
    }

    // 基本的なクリプトタグを追加
    const text = `${item.title} ${item.content || ''}`.toLowerCase()
    if (text.includes('crypto') || text.includes('bitcoin') || text.includes('ethereum')) {
      topics.push('crypto')
    }
    if (text.includes('news') || text.includes('report') || text.includes('announcement')) {
      topics.push('news')
    }

    // 重複を除去して返す
    return [...new Set(topics)]
  }

  /**
   * データベースに保存済みかチェック
   */
  async isAlreadySaved(guid: string): Promise<boolean> {
    const existing = await prisma.newsItem.findFirst({
      where: { guid },
      select: { id: true }
    })
    return !!existing
  }

  /**
   * ニュースアイテムをデータベースに保存
   */
  async saveNewsItems(items: ParsedNewsItem[]): Promise<number> {
    let savedCount = 0

    for (const item of items) {
      try {
        // 既に保存済みかチェック
        if (await this.isAlreadySaved(item.guid)) {
          continue
        }

        // データベースに保存
        await prisma.newsItem.create({
          data: {
            title: item.title,
            summary: item.summary,
            content: item.content,
            url: item.url,
            imageUrl: item.imageUrl,
            source: item.source,
            author: item.author,
            topics: item.topics,
            coins: item.coins,
            companies: item.companies,
            products: item.products,
            technology: item.technology,
            market: item.market,
            regulatory: item.regulatory,
            regions: item.regions,
            publishedAt: item.publishedAt,
            guid: item.guid,
            sentiment: 0, // 後でセンチメント分析を実装
            importance: 5, // デフォルト値
            hasGeneratedArticle: false
          }
        })

        savedCount++
      } catch (error) {
        logger.warn('ニュースアイテムの保存に失敗', { guid: item.guid, error })
      }
    }

    logger.info('ニュースアイテムを保存', { savedCount, totalCount: items.length })
    return savedCount
  }

  /**
   * 複数のRSSソースから一括収集
   */
  async collectFromAllSources(): Promise<{ total: number; sources: number }> {
    logger.info('Prismaクライアントの確認', { 
      prisma: !!prisma,
      rSSSource: !!prisma?.rSSSource,
      findMany: !!prisma?.rSSSource?.findMany
    })
    
    const sources = await prisma.rSSSource.findMany({
      where: { enabled: true }
    })

    logger.info('アクティブなRSSソースから収集を開始', { sourceCount: sources.length })

    let totalSaved = 0
    let successfulSources = 0

    for (const source of sources) {
      try {
        const items = await this.fetchAndParseFeed(source.url)
        const savedCount = await this.saveNewsItems(items)
        
        totalSaved += savedCount
        if (savedCount > 0) {
          successfulSources++
        }

        // ソースの最終収集時刻を更新
        await prisma.rSSSource.update({
          where: { id: source.id },
          data: {
            lastCollected: new Date(),
            totalCollected: {
              increment: savedCount
            },
            status: 'active'
          }
        })
      } catch (error) {
        logger.error('ソースからの収集に失敗', error as Error, { sourceId: source.id, url: source.url })
        
        // エラーステータスを更新
        await prisma.rSSSource.update({
          where: { id: source.id },
          data: { status: 'error' }
        })
      }
    }

    logger.info('全ソースからの収集が完了', { totalSaved, successfulSources })
    return { total: totalSaved, sources: successfulSources }
  }
}

// シングルトンインスタンス
export const rssParser = new RSSParserService()