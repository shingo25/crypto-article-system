import { simpleQueueManager, JobType } from '../queue-simple'
import { createComponentLogger } from '../simple-logger'
import { AppError, ErrorType } from '../error-handler'
import { AiArticleService } from '../ai'
import { prisma } from '../prisma'

const componentLogger = createComponentLogger('ArticleGeneratorWorker')

// 記事生成ジョブのデータ型定義
export interface ArticleGenerationJobData {
  newsId: string
  userId: string
  templateId?: string
  options?: {
    style?: 'detailed' | 'concise' | 'technical'
    length?: 'short' | 'medium' | 'long'
  }
}

// 記事生成プロセッサ
export async function processArticleGeneration(data: ArticleGenerationJobData): Promise<string> {
  const { newsId, userId, templateId, options } = data
  const startTime = Date.now()

  try {
    componentLogger.info('記事生成ジョブを開始', {
      newsId,
      userId,
      templateId,
      options
    })

    // 1. ニュース記事を取得
    componentLogger.info('ニュース記事を取得中', { newsId })
    const newsItem = await prisma.newsItem.findUnique({
      where: { id: newsId }
    })

    if (!newsItem) {
      throw new AppError('News item not found', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'NEWS_NOT_FOUND',
        statusCode: 404,
        context: { newsId }
      })
    }

    // 2. AI記事生成を実行
    componentLogger.info('AI記事生成を実行中')
    const generatedArticle = await AiArticleService.generateFromNews(
      newsId, 
      userId,
      options
    )

    if (!generatedArticle) {
      throw new AppError('Failed to generate article', {
        type: ErrorType.PROCESSING_ERROR,
        code: 'GENERATION_FAILED',
        statusCode: 500
      })
    }

    // 3. 記事をデータベースに保存
    componentLogger.info('記事をデータベースに保存中')
    
    // スラッグを生成（タイトルから）
    const slug = generateSlug(generatedArticle.title)
    
    const savedArticle = await prisma.article.create({
      data: {
        title: generatedArticle.title,
        content: generatedArticle.content,
        summary: generatedArticle.summary,
        slug,
        status: 'DRAFT',
        sourceType: 'NEWS',
        sourceData: {
          newsId: newsItem.id,
          newsTitle: newsItem.title,
          newsUrl: newsItem.url,
          newsSource: newsItem.source
        },
        generatedBy: generatedArticle.metadata.generatedBy,
        tags: generatedArticle.tags,
        keywords: generatedArticle.tags, // 同じタグをキーワードとしても使用
        metaTitle: generatedArticle.title,
        metaDescription: generatedArticle.summary,
        authorId: userId,
        templateId: templateId || null
      }
    })

    // 4. 記事バージョンを作成
    await prisma.articleVersion.create({
      data: {
        articleId: savedArticle.id,
        version: 1,
        title: generatedArticle.title,
        content: generatedArticle.content,
        changes: 'Initial AI generation'
      }
    })

    // 5. ニュース記事の生成フラグを更新
    await prisma.newsItem.update({
      where: { id: newsId },
      data: {
        hasGeneratedArticle: true,
        generatedArticleId: savedArticle.id
      }
    })

    const duration = Date.now() - startTime
    componentLogger.info('記事生成完了', {
      articleId: savedArticle.id,
      newsId,
      userId,
      duration,
      wordCount: generatedArticle.metadata.wordCount,
      title: generatedArticle.title
    })

    return savedArticle.id

  } catch (error) {
    const duration = Date.now() - startTime
    componentLogger.error('記事生成に失敗', error as Error, {
      newsId,
      userId,
      templateId,
      duration
    })

    throw error
  }
}

// スラッグ生成ヘルパー関数
function generateSlug(title: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  
  // 日本語タイトルの場合はタイムスタンプとランダム文字列を使用
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // 英数字とスペース、ハイフンのみ残す
    .trim()
    .replace(/\s+/g, '-') // スペースをハイフンに変換
    .replace(/-+/g, '-') // 連続するハイフンを1つに
    .replace(/^-|-$/g, '') // 先頭と末尾のハイフンを削除

  // 英数字が含まれている場合はそれを使用、そうでなければタイムスタンプベース
  if (baseSlug.length > 0) {
    return `${baseSlug}-${timestamp}-${randomString}`
  } else {
    return `article-${timestamp}-${randomString}`
  }
}

// ワーカーの初期化
export function initializeArticleGeneratorWorker() {
  // 記事生成プロセッサを登録
  simpleQueueManager.registerProcessor(JobType.GENERATE_ARTICLE, processArticleGeneration)
  
  componentLogger.info('記事生成ワーカーを初期化しました')
}

// 記事生成ジョブを追加するヘルパー関数
export async function addArticleGenerationJob(data: ArticleGenerationJobData): Promise<string> {
  try {
    const jobId = await simpleQueueManager.addJob(JobType.GENERATE_ARTICLE, data)
    
    componentLogger.info('記事生成ジョブを追加', {
      jobId,
      newsId: data.newsId,
      userId: data.userId
    })
    
    return jobId
  } catch (error) {
    componentLogger.error('記事生成ジョブの追加に失敗', error as Error, data)
    throw error
  }
}