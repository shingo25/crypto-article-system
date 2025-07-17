import { createComponentLogger } from './logger'
import { AppError, ErrorType } from './error-handler'
import { tenantManager } from './tenant'

const componentLogger = createComponentLogger('RecommendationEngine')

// レコメンデーションの型定義
export interface UserProfile {
  userId: string
  tenantId: string
  preferences: {
    topics: string[]
    categories: string[]
    tags: string[]
    languages: string[]
    contentTypes: ('article' | 'analysis' | 'news' | 'tutorial')[]
    readingLevel: 'beginner' | 'intermediate' | 'advanced'
    updateFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly'
  }
  behavior: {
    viewHistory: ViewEvent[]
    readingTime: Record<string, number> // contentId -> seconds
    interactions: InteractionEvent[]
    searchHistory: SearchEvent[]
    feedback: FeedbackEvent[]
  }
  demographics: {
    timezone: string
    location?: string
    profession?: string
    experience?: string
  }
  createdAt: string
  updatedAt: string
}

export interface ViewEvent {
  contentId: string
  timestamp: string
  duration: number // seconds
  source: 'search' | 'recommendation' | 'browse' | 'feed'
  device: 'desktop' | 'mobile' | 'tablet'
  completed: boolean
}

export interface InteractionEvent {
  contentId: string
  type: 'like' | 'share' | 'bookmark' | 'comment' | 'download'
  timestamp: string
  metadata?: Record<string, any>
}

export interface SearchEvent {
  query: string
  timestamp: string
  results: number
  clickedResults: string[]
}

export interface FeedbackEvent {
  contentId: string
  type: 'rating' | 'relevant' | 'not_relevant' | 'helpful' | 'not_helpful'
  value: number | boolean
  timestamp: string
  comment?: string
}

export interface ContentFeatures {
  contentId: string
  title: string
  type: 'article' | 'analysis' | 'news' | 'tutorial'
  categories: string[]
  tags: string[]
  topics: string[]
  language: string
  readingLevel: 'beginner' | 'intermediate' | 'advanced'
  length: number
  complexity: number // 0-1
  recency: number // days since published
  popularity: number // engagement score
  sentiment: 'positive' | 'negative' | 'neutral'
  trendingScore: number // 0-1
  authorCredibility: number // 0-1
  technicalDepth: number // 0-1
  marketRelevance: number // 0-1
  embeddings?: number[] // content vector embeddings
}

export interface RecommendationRequest {
  userId: string
  tenantId: string
  count?: number
  filters?: {
    categories?: string[]
    tags?: string[]
    contentTypes?: string[]
    minQuality?: number
    maxAge?: number // days
  }
  context?: {
    currentContent?: string
    sessionTopics?: string[]
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
    device?: 'desktop' | 'mobile' | 'tablet'
  }
}

export interface Recommendation {
  contentId: string
  score: number
  confidence: number
  reasons: RecommendationReason[]
  metadata: {
    algorithm: string
    factors: Record<string, number>
    timestamp: string
  }
}

export interface RecommendationReason {
  type: 'preference' | 'behavior' | 'content' | 'social' | 'trending'
  description: string
  weight: number
}

// レコメンデーションエンジンクラス
export class RecommendationEngine {
  private static instance: RecommendationEngine
  private userProfiles: Map<string, UserProfile> = new Map()
  private contentFeatures: Map<string, ContentFeatures> = new Map()
  private modelWeights = {
    collaborative: 0.3,
    contentBased: 0.4,
    behavioral: 0.2,
    trending: 0.1
  }

  public static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine()
    }
    return RecommendationEngine.instance
  }

  // ユーザープロファイル作成・更新
  public async createOrUpdateUserProfile(
    userId: string,
    tenantId: string,
    profileData: Partial<UserProfile>
  ): Promise<UserProfile> {
    try {
      const existingProfile = this.userProfiles.get(`${tenantId}:${userId}`)
      
      const profile: UserProfile = {
        userId,
        tenantId,
        preferences: {
          topics: [],
          categories: [],
          tags: [],
          languages: ['ja'],
          contentTypes: ['article', 'analysis'],
          readingLevel: 'intermediate',
          updateFrequency: 'daily',
          ...existingProfile?.preferences,
          ...profileData.preferences
        },
        behavior: {
          viewHistory: [],
          readingTime: {},
          interactions: [],
          searchHistory: [],
          feedback: [],
          ...existingProfile?.behavior,
          ...profileData.behavior
        },
        demographics: {
          timezone: 'Asia/Tokyo',
          ...existingProfile?.demographics,
          ...profileData.demographics
        },
        createdAt: existingProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      this.userProfiles.set(`${tenantId}:${userId}`, profile)
      await this.saveUserProfile(profile)

      componentLogger.info('ユーザープロファイルを更新', { userId, tenantId })
      return profile
    } catch (error) {
      componentLogger.error('ユーザープロファイル更新に失敗', error as Error)
      throw error
    }
  }

  // ユーザー行動記録
  public async recordUserBehavior(
    userId: string,
    tenantId: string,
    event: ViewEvent | InteractionEvent | SearchEvent | FeedbackEvent
  ): Promise<void> {
    try {
      const profile = await this.getUserProfile(userId, tenantId)
      if (!profile) return

      // イベントタイプに応じて記録
      if ('duration' in event) {
        // ViewEvent
        profile.behavior.viewHistory.push(event as ViewEvent)
        profile.behavior.viewHistory = profile.behavior.viewHistory.slice(-1000) // 最新1000件

        // 読了時間を記録
        const viewEvent = event as ViewEvent
        profile.behavior.readingTime[viewEvent.contentId] = 
          (profile.behavior.readingTime[viewEvent.contentId] || 0) + viewEvent.duration
      } else if ('type' in event && ['like', 'share', 'bookmark', 'comment', 'download'].includes((event as InteractionEvent).type)) {
        // InteractionEvent
        profile.behavior.interactions.push(event as InteractionEvent)
        profile.behavior.interactions = profile.behavior.interactions.slice(-1000)
      } else if ('query' in event) {
        // SearchEvent
        profile.behavior.searchHistory.push(event as SearchEvent)
        profile.behavior.searchHistory = profile.behavior.searchHistory.slice(-500)
      } else if ('value' in event) {
        // FeedbackEvent
        profile.behavior.feedback.push(event as FeedbackEvent)
        profile.behavior.feedback = profile.behavior.feedback.slice(-1000)
      }

      profile.updatedAt = new Date().toISOString()
      this.userProfiles.set(`${tenantId}:${userId}`, profile)
      await this.saveUserProfile(profile)

      // プロファイルの自動更新
      await this.updateUserPreferencesFromBehavior(profile)

    } catch (error) {
      componentLogger.error('ユーザー行動記録に失敗', error as Error)
    }
  }

  // コンテンツ特徴量登録
  public async registerContentFeatures(features: ContentFeatures): Promise<void> {
    try {
      this.contentFeatures.set(features.contentId, features)
      await this.saveContentFeatures(features)

      componentLogger.debug('コンテンツ特徴量を登録', { contentId: features.contentId })
    } catch (error) {
      componentLogger.error('コンテンツ特徴量登録に失敗', error as Error)
      throw error
    }
  }

  // レコメンデーション生成
  public async generateRecommendations(request: RecommendationRequest): Promise<Recommendation[]> {
    try {
      const startTime = Date.now()
      const { userId, tenantId, count = 10 } = request

      // テナントの機能チェック
      const context = await tenantManager.getTenantContext(tenantId)
      if (!tenantManager.hasFeature(context.tenant, 'aiRecommendations')) {
        throw new AppError('AI recommendations not available in current plan', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'FEATURE_NOT_AVAILABLE',
          statusCode: 403,
          userMessage: 'AIレコメンデーション機能は現在のプランでは利用できません'
        })
      }

      const userProfile = await this.getUserProfile(userId, tenantId)
      if (!userProfile) {
        // 新規ユーザーの場合、トレンドベースのレコメンデーション
        return this.generateTrendingRecommendations(request)
      }

      // 複数アルゴリズムでレコメンデーション生成
      const [collaborative, contentBased, behavioral, trending] = await Promise.all([
        this.generateCollaborativeRecommendations(userProfile, request),
        this.generateContentBasedRecommendations(userProfile, request),
        this.generateBehavioralRecommendations(userProfile, request),
        this.generateTrendingRecommendations(request)
      ])

      // ハイブリッド結合
      const hybridRecommendations = this.combineRecommendations([
        { recommendations: collaborative, weight: this.modelWeights.collaborative },
        { recommendations: contentBased, weight: this.modelWeights.contentBased },
        { recommendations: behavioral, weight: this.modelWeights.behavioral },
        { recommendations: trending, weight: this.modelWeights.trending }
      ])

      // フィルタリングと最終調整
      const finalRecommendations = this.applyFiltersAndRanking(
        hybridRecommendations,
        request,
        userProfile
      ).slice(0, count)

      componentLogger.performance('レコメンデーション生成', Date.now() - startTime, {
        userId,
        tenantId,
        resultCount: finalRecommendations.length,
        algorithms: ['collaborative', 'content-based', 'behavioral', 'trending']
      })

      return finalRecommendations
    } catch (error) {
      componentLogger.error('レコメンデーション生成に失敗', error as Error)
      throw error
    }
  }

  // 協調フィルタリング
  private async generateCollaborativeRecommendations(
    userProfile: UserProfile,
    request: RecommendationRequest
  ): Promise<Recommendation[]> {
    // 類似ユーザーを見つける
    const similarUsers = await this.findSimilarUsers(userProfile)
    const recommendations: Recommendation[] = []

    for (const similarUser of similarUsers.slice(0, 50)) { // 上位50人
      const otherProfile = await this.getUserProfile(similarUser.userId, userProfile.tenantId)
      if (!otherProfile) continue

      // 類似ユーザーが高評価したコンテンツを推薦
      const highRatedContent = otherProfile.behavior.feedback
        .filter(f => f.type === 'rating' && (f.value as number) >= 4)
        .map(f => f.contentId)

      for (const contentId of highRatedContent) {
        // ユーザーが未読のコンテンツのみ
        if (!this.hasUserInteractedWith(userProfile, contentId)) {
          const features = this.contentFeatures.get(contentId)
          if (features) {
            recommendations.push({
              contentId,
              score: similarUser.similarity * 0.8,
              confidence: similarUser.similarity,
              reasons: [{
                type: 'social',
                description: '類似した嗜好のユーザーが高評価',
                weight: similarUser.similarity
              }],
              metadata: {
                algorithm: 'collaborative-filtering',
                factors: { similarity: similarUser.similarity },
                timestamp: new Date().toISOString()
              }
            })
          }
        }
      }
    }

    return recommendations
  }

  // コンテンツベースフィルタリング
  private async generateContentBasedRecommendations(
    userProfile: UserProfile,
    request: RecommendationRequest
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = []
    const userInterests = this.extractUserInterests(userProfile)

    for (const [contentId, features] of this.contentFeatures) {
      if (this.hasUserInteractedWith(userProfile, contentId)) continue

      const similarity = this.calculateContentSimilarity(userInterests, features)
      if (similarity > 0.3) {
        const reasons: RecommendationReason[] = []

        // 理由を特定
        if (features.categories.some(cat => userProfile.preferences.categories.includes(cat))) {
          reasons.push({
            type: 'preference',
            description: `興味のあるカテゴリ: ${features.categories.join(', ')}`,
            weight: 0.7
          })
        }

        if (features.tags.some(tag => userProfile.preferences.tags.includes(tag))) {
          reasons.push({
            type: 'preference',
            description: `関連タグ: ${features.tags.join(', ')}`,
            weight: 0.6
          })
        }

        recommendations.push({
          contentId,
          score: similarity,
          confidence: similarity * 0.9,
          reasons,
          metadata: {
            algorithm: 'content-based-filtering',
            factors: { similarity, recency: features.recency, popularity: features.popularity },
            timestamp: new Date().toISOString()
          }
        })
      }
    }

    return recommendations
  }

  // 行動ベースレコメンデーション
  private async generateBehavioralRecommendations(
    userProfile: UserProfile,
    request: RecommendationRequest
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = []
    const recentViews = userProfile.behavior.viewHistory.slice(-50) // 最近50件

    // 最近見たコンテンツに関連するコンテンツを推薦
    for (const view of recentViews) {
      const seedContent = this.contentFeatures.get(view.contentId)
      if (!seedContent) continue

      // 関連コンテンツを検索
      const relatedContent = this.findRelatedContent(seedContent, 5)
      
      for (const related of relatedContent) {
        if (!this.hasUserInteractedWith(userProfile, related.contentId)) {
          recommendations.push({
            contentId: related.contentId,
            score: related.similarity * (view.completed ? 1.0 : 0.7),
            confidence: related.similarity * 0.8,
            reasons: [{
              type: 'behavior',
              description: `"${seedContent.title}"を読んだユーザーにおすすめ`,
              weight: related.similarity
            }],
            metadata: {
              algorithm: 'behavioral-pattern',
              factors: { 
                basedOn: view.contentId,
                similarity: related.similarity,
                readCompletion: view.completed
              },
              timestamp: new Date().toISOString()
            }
          })
        }
      }
    }

    return recommendations
  }

  // トレンドベースレコメンデーション
  private async generateTrendingRecommendations(
    request: RecommendationRequest
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = []
    const trendingContent = Array.from(this.contentFeatures.values())
      .filter(f => f.trendingScore > 0.5)
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 20)

    for (const content of trendingContent) {
      recommendations.push({
        contentId: content.contentId,
        score: content.trendingScore * 0.8,
        confidence: content.trendingScore,
        reasons: [{
          type: 'trending',
          description: 'いま話題のコンテンツ',
          weight: content.trendingScore
        }],
        metadata: {
          algorithm: 'trending',
          factors: { 
            trendingScore: content.trendingScore,
            popularity: content.popularity,
            recency: content.recency
          },
          timestamp: new Date().toISOString()
        }
      })
    }

    return recommendations
  }

  // ハイブリッド結合
  private combineRecommendations(
    algorithmResults: Array<{ recommendations: Recommendation[]; weight: number }>
  ): Recommendation[] {
    const combinedScores = new Map<string, {
      totalScore: number,
      confidence: number,
      reasons: RecommendationReason[],
      algorithms: string[]
    }>()

    for (const { recommendations, weight } of algorithmResults) {
      for (const rec of recommendations) {
        const existing = combinedScores.get(rec.contentId)
        if (existing) {
          existing.totalScore += rec.score * weight
          existing.confidence = Math.max(existing.confidence, rec.confidence)
          existing.reasons.push(...rec.reasons)
          existing.algorithms.push(rec.metadata.algorithm)
        } else {
          combinedScores.set(rec.contentId, {
            totalScore: rec.score * weight,
            confidence: rec.confidence,
            reasons: [...rec.reasons],
            algorithms: [rec.metadata.algorithm]
          })
        }
      }
    }

    return Array.from(combinedScores.entries())
      .map(([contentId, data]) => ({
        contentId,
        score: data.totalScore,
        confidence: data.confidence,
        reasons: data.reasons,
        metadata: {
          algorithm: 'hybrid',
          factors: { algorithms: data.algorithms },
          timestamp: new Date().toISOString()
        }
      }))
      .sort((a, b) => b.score - a.score)
  }

  // ヘルパーメソッド
  private async getUserProfile(userId: string, tenantId: string): Promise<UserProfile | null> {
    return this.userProfiles.get(`${tenantId}:${userId}`) || null
  }

  private hasUserInteractedWith(profile: UserProfile, contentId: string): boolean {
    return profile.behavior.viewHistory.some(v => v.contentId === contentId) ||
           profile.behavior.interactions.some(i => i.contentId === contentId)
  }

  private extractUserInterests(profile: UserProfile): ContentFeatures {
    // ユーザーの行動履歴から興味を抽出
    const viewedContent = profile.behavior.viewHistory
      .map(v => this.contentFeatures.get(v.contentId))
      .filter(Boolean) as ContentFeatures[]

    const categories = new Set<string>()
    const tags = new Set<string>()
    const topics = new Set<string>()

    viewedContent.forEach(content => {
      content.categories.forEach(cat => categories.add(cat))
      content.tags.forEach(tag => tags.add(tag))
      content.topics.forEach(topic => topics.add(topic))
    })

    return {
      contentId: 'user-interests',
      title: 'User Interests',
      type: 'article',
      categories: Array.from(categories),
      tags: Array.from(tags),
      topics: Array.from(topics),
      language: profile.preferences.languages[0] || 'ja',
      readingLevel: profile.preferences.readingLevel,
      length: 0,
      complexity: 0.5,
      recency: 0,
      popularity: 0,
      sentiment: 'neutral',
      trendingScore: 0,
      authorCredibility: 0,
      technicalDepth: 0.5,
      marketRelevance: 0.5
    }
  }

  private calculateContentSimilarity(userInterests: ContentFeatures, content: ContentFeatures): number {
    let similarity = 0
    let factors = 0

    // カテゴリ類似度
    const categoryOverlap = userInterests.categories.filter(cat => 
      content.categories.includes(cat)
    ).length
    if (categoryOverlap > 0) {
      similarity += (categoryOverlap / Math.max(userInterests.categories.length, content.categories.length)) * 0.4
      factors++
    }

    // タグ類似度
    const tagOverlap = userInterests.tags.filter(tag => 
      content.tags.includes(tag)
    ).length
    if (tagOverlap > 0) {
      similarity += (tagOverlap / Math.max(userInterests.tags.length, content.tags.length)) * 0.3
      factors++
    }

    // トピック類似度
    const topicOverlap = userInterests.topics.filter(topic => 
      content.topics.includes(topic)
    ).length
    if (topicOverlap > 0) {
      similarity += (topicOverlap / Math.max(userInterests.topics.length, content.topics.length)) * 0.3
      factors++
    }

    return factors > 0 ? similarity : 0
  }

  private findRelatedContent(seedContent: ContentFeatures, limit: number): Array<{contentId: string, similarity: number}> {
    const related: Array<{contentId: string, similarity: number}> = []

    for (const [contentId, features] of this.contentFeatures) {
      if (contentId === seedContent.contentId) continue

      const similarity = this.calculateContentSimilarity(seedContent, features)
      if (similarity > 0.2) {
        related.push({ contentId, similarity })
      }
    }

    return related.sort((a, b) => b.similarity - a.similarity).slice(0, limit)
  }

  private async findSimilarUsers(userProfile: UserProfile): Promise<Array<{userId: string, similarity: number}>> {
    // 実際の実装では、ベクトル類似度やコサイン類似度を使用
    // ここでは簡略化
    return []
  }

  private async updateUserPreferencesFromBehavior(profile: UserProfile): Promise<void> {
    // 行動履歴から嗜好を自動更新
    const recentViews = profile.behavior.viewHistory.slice(-100)
    const categoryCount = new Map<string, number>()
    const tagCount = new Map<string, number>()

    recentViews.forEach(view => {
      const content = this.contentFeatures.get(view.contentId)
      if (content) {
        content.categories.forEach(cat => {
          categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1)
        })
        content.tags.forEach(tag => {
          tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
        })
      }
    })

    // 頻出カテゴリ・タグを嗜好に追加
    const topCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cat]) => cat)

    const topTags = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag)

    profile.preferences.categories = [...new Set([...profile.preferences.categories, ...topCategories])]
    profile.preferences.tags = [...new Set([...profile.preferences.tags, ...topTags])]
  }

  private applyFiltersAndRanking(
    recommendations: Recommendation[],
    request: RecommendationRequest,
    userProfile?: UserProfile
  ): Recommendation[] {
    let filtered = recommendations

    // フィルタ適用
    if (request.filters) {
      filtered = filtered.filter(rec => {
        const content = this.contentFeatures.get(rec.contentId)
        if (!content) return false

        if (request.filters!.categories && !request.filters!.categories.some(cat => 
          content.categories.includes(cat)
        )) {
          return false
        }

        if (request.filters!.contentTypes && !request.filters!.contentTypes.includes(content.type)) {
          return false
        }

        if (request.filters!.minQuality && rec.confidence < request.filters!.minQuality) {
          return false
        }

        if (request.filters!.maxAge && content.recency > request.filters!.maxAge) {
          return false
        }

        return true
      })
    }

    // 多様性の確保（同じカテゴリが連続しないように）
    return this.diversifyRecommendations(filtered)
  }

  private diversifyRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const diversified: Recommendation[] = []
    const usedCategories = new Set<string>()
    
    // 高スコアから順に、カテゴリの多様性を考慮して選択
    for (const rec of recommendations) {
      const content = this.contentFeatures.get(rec.contentId)
      if (content) {
        const hasNewCategory = content.categories.some(cat => !usedCategories.has(cat))
        
        if (hasNewCategory || diversified.length < 3) {
          diversified.push(rec)
          content.categories.forEach(cat => usedCategories.add(cat))
        }
      }
    }

    // 残りのスロットを埋める
    const remaining = recommendations.filter(rec => !diversified.includes(rec))
    diversified.push(...remaining)

    return diversified
  }

  private async saveUserProfile(profile: UserProfile): Promise<void> {
    // 実際の実装では、データベースに保存
    componentLogger.debug('ユーザープロファイルを保存', { userId: profile.userId })
  }

  private async saveContentFeatures(features: ContentFeatures): Promise<void> {
    // 実際の実装では、データベースに保存
    componentLogger.debug('コンテンツ特徴量を保存', { contentId: features.contentId })
  }
}

// シングルトンインスタンス
export const recommendationEngine = RecommendationEngine.getInstance()