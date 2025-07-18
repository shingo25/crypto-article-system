import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/lib/stores/workspaceStore'
import { Topic, Article } from '@/lib/stores/workspaceStore'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// API フェッチ関数
async function fetchTopics(): Promise<Topic[]> {
  const response = await fetch(`${API_BASE_URL}/api/topics`)
  if (!response.ok) throw new Error('Failed to fetch topics')
  return response.json()
}

async function generateArticle(topicId: string, settings: any): Promise<Article> {
  const response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicId, settings })
  })
  if (!response.ok) throw new Error('Failed to generate article')
  return response.json()
}

async function saveArticle(article: Article): Promise<Article> {
  const response = await fetch(`${API_BASE_URL}/api/articles/${article.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(article)
  })
  if (!response.ok) throw new Error('Failed to save article')
  return response.json()
}

// カスタムフック
export function useWorkspaceAPI() {
  const queryClient = useQueryClient()
  const {
    setTopics,
    selectedTopic,
    setCurrentArticle,
    setGenerationState,
    generationSettings
  } = useWorkspaceStore()

  // トピック取得
  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: fetchTopics,
    onSuccess: (data) => {
      setTopics(data)
    }
  })

  // 記事生成
  const generateMutation = useMutation({
    mutationFn: ({ topicId, settings }: { topicId: string; settings: any }) => 
      generateArticle(topicId, settings),
    onMutate: () => {
      setGenerationState({
        isGenerating: true,
        progress: 0,
        currentStep: 'Initializing generation...',
        startedAt: new Date(),
        error: null
      })
    },
    onSuccess: (article) => {
      setCurrentArticle(article)
      setGenerationState({
        isGenerating: false,
        progress: 100,
        currentStep: 'Generation complete',
        startedAt: null,
        error: null
      })
    },
    onError: (error) => {
      setGenerationState({
        isGenerating: false,
        progress: 0,
        currentStep: '',
        startedAt: null,
        error: error instanceof Error ? error.message : 'Generation failed'
      })
    }
  })

  // 記事保存
  const saveMutation = useMutation({
    mutationFn: saveArticle,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['articles'])
      setCurrentArticle(data)
    }
  })

  // 進捗のシミュレーション（WebSocketに置き換え可能）
  const simulateProgress = () => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
      }
      setGenerationState({
        isGenerating: true,
        progress: Math.min(progress, 99),
        currentStep: getProgressStep(progress),
        startedAt: new Date(),
        error: null
      })
    }, 1000)
  }

  const getProgressStep = (progress: number): string => {
    if (progress < 20) return 'Analyzing topic and market data...'
    if (progress < 40) return 'Gathering relevant information...'
    if (progress < 60) return 'Generating article structure...'
    if (progress < 80) return 'Writing content sections...'
    if (progress < 95) return 'Optimizing and formatting...'
    return 'Finalizing article...'
  }

  const handleGenerateArticle = async () => {
    if (!selectedTopic) return
    
    simulateProgress()
    await generateMutation.mutateAsync({
      topicId: selectedTopic.id,
      settings: generationSettings
    })
  }

  const handleSaveArticle = async (article: Article) => {
    await saveMutation.mutateAsync(article)
  }

  return {
    topics,
    topicsLoading,
    generateArticle: handleGenerateArticle,
    saveArticle: handleSaveArticle,
    isGenerating: generateMutation.isLoading,
    isSaving: saveMutation.isLoading
  }
}