import { useQuery } from '@tanstack/react-query'

// NewsItem型定義（Prismaモデルに基づく）
export interface NewsItem {
  id: string
  title: string
  summary?: string
  content?: string
  url: string
  imageUrl?: string
  source: string
  author?: string
  sentiment?: number
  importance: number
  publishedAt: string
  hasGeneratedArticle: boolean
  generatedArticleId?: string
  createdAt: string
  updatedAt: string
}

interface NewsItemsResponse {
  success: boolean
  data: {
    newsItems: NewsItem[]
    pagination: {
      page: number
      limit: number
      totalCount: number
      totalPages: number
      hasNextPage: boolean
      hasPrevPage: boolean
    }
    filters: {
      source?: string
      importance?: number
      hasGeneratedArticle?: boolean
      search?: string
      sortBy?: string
      sortOrder?: string
    }
  }
}

interface UseNewsItemsOptions {
  page?: number
  limit?: number
  source?: string
  importance?: number
  hasGeneratedArticle?: boolean
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  enabled?: boolean
}

// API関数
const fetchNewsItems = async (options: UseNewsItemsOptions = {}): Promise<NewsItemsResponse> => {
  const searchParams = new URLSearchParams()
  
  if (options.page) searchParams.set('page', options.page.toString())
  if (options.limit) searchParams.set('limit', options.limit.toString())
  if (options.source) searchParams.set('source', options.source)
  if (options.importance) searchParams.set('importance', options.importance.toString())
  if (options.hasGeneratedArticle !== undefined) {
    searchParams.set('hasGeneratedArticle', options.hasGeneratedArticle.toString())
  }
  if (options.search) searchParams.set('search', options.search)
  if (options.sortBy) searchParams.set('sortBy', options.sortBy)
  if (options.sortOrder) searchParams.set('sortOrder', options.sortOrder)

  const url = `/api/news-items?${searchParams.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'ニュース一覧の取得に失敗しました')
  }

  return response.json()
}

// カスタムフック
export const useNewsItems = (options: UseNewsItemsOptions = {}) => {
  const {
    page = 1,
    limit = 20,
    source,
    importance,
    hasGeneratedArticle,
    search,
    sortBy = 'publishedAt',
    sortOrder = 'desc',
    enabled = true
  } = options

  return useQuery({
    queryKey: [
      'news-items',
      page,
      limit,
      source,
      importance,
      hasGeneratedArticle,
      search,
      sortBy,
      sortOrder
    ],
    queryFn: () => fetchNewsItems({
      page,
      limit,
      source,
      importance,
      hasGeneratedArticle,
      search,
      sortBy,
      sortOrder
    }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
    refetchOnWindowFocus: false,
  })
}

// 未生成記事の取得（記事生成フォーム用）
export const useUnprocessedNewsItems = (options: Omit<UseNewsItemsOptions, 'hasGeneratedArticle'> = {}) => {
  return useNewsItems({
    ...options,
    hasGeneratedArticle: false,
    sortBy: 'importance',
    sortOrder: 'desc'
  })
}

// 特定のニュースアイテムを取得
export const useNewsItem = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ['news-item', id],
    queryFn: async (): Promise<{ success: boolean; data: NewsItem }> => {
      const response = await fetch(`/api/news-items/${id}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'ニュースの取得に失敗しました')
      }

      return response.json()
    },
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000, // 10分間はキャッシュを使用
  })
}