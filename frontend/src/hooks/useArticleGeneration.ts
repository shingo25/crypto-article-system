import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'

// API関数の型定義
interface GenerateArticleRequest {
  newsId: string
  templateId?: string
  options?: {
    style?: 'detailed' | 'concise' | 'technical'
    length?: 'short' | 'medium' | 'long'
  }
}

interface GenerateArticleResponse {
  success: boolean
  data: {
    jobId: string
    status: string
    message: string
    estimatedTime: string
    checkStatusUrl: string
  }
}

interface JobStatus {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  processedAt?: string
  error?: string
  data: {
    newsId: string
    options?: {
      style?: 'detailed' | 'concise' | 'technical'
      length?: 'short' | 'medium' | 'long'
    }
  }
  message?: string
  progress?: number
  estimatedRemainingTime?: string
  article?: {
    id: string
    title: string
    summary: string
    status: string
    createdAt: string
    url: string
  }
}

interface JobStatusResponse {
  success: boolean
  data: JobStatus
}

// API関数
const generateArticle = async (request: GenerateArticleRequest): Promise<GenerateArticleResponse> => {
  const response = await fetch('/api/articles/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || '記事生成の開始に失敗しました')
  }

  return response.json()
}

const getJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
  const response = await fetch(`/api/jobs/${jobId}/status`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'ジョブステータスの取得に失敗しました')
  }

  return response.json()
}

// カスタムフック
export const useArticleGeneration = () => {
  const queryClient = useQueryClient()
  const [jobId, setJobId] = useState<string | null>(null)

  // 記事生成API呼び出し
  const generateMutation = useMutation({
    mutationFn: generateArticle,
    onSuccess: (data) => {
      toast.success(data.data.message || '記事の生成を開始しました')
      setJobId(data.data.jobId)
    },
    onError: (error: Error) => {
      toast.error(`エラーが発生しました: ${error.message}`)
    },
  })

  // ジョブステータスポーリング
  const {
    data: jobStatusResponse,
    isLoading: isPolling,
    error: pollingError
  } = useQuery({
    queryKey: ['job-status', jobId],
    queryFn: () => getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      // ジョブが完了または失敗したらポーリングを停止
      return status === 'completed' || status === 'failed' ? false : 3000
    },
    onSuccess: (data) => {
      const job = data.data
      if (job.status === 'completed') {
        toast.success('記事が完成しました！')
        // 記事一覧や関連データを再取得
        queryClient.invalidateQueries({ queryKey: ['articles'] })
        // 少し遅延してからポーリングを停止
        setTimeout(() => setJobId(null), 1000)
      } else if (job.status === 'failed') {
        toast.error(`記事の生成に失敗しました: ${job.error || '不明なエラー'}`)
        setJobId(null)
      }
    },
    onError: (error: Error) => {
      toast.error(`ステータス確認エラー: ${error.message}`)
      setJobId(null)
    }
  })

  // ジョブをクリア（手動停止）
  const clearJob = () => {
    setJobId(null)
  }

  return {
    // 記事生成
    generate: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
    generateError: generateMutation.error,

    // ジョブステータス
    job: jobStatusResponse?.data || null,
    isPolling,
    pollingError,

    // ユーティリティ
    clearJob,
    hasActiveJob: !!jobId,
  }
}