// テスト用のモックジョブシステム
// 本来はRedisやデータベースを使用すべきだが、テスト用に簡易実装

interface MockJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  newsId: string
  userId: string
  createdAt: string
  processedAt?: string
  completedAt?: string
  error?: string
  progress?: number
  message?: string
  article?: {
    id: string
    title: string
    summary: string
    status: string
    createdAt: string
    url: string
  }
}

// ジョブを簡易的にファイルシステムに保存
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const JOBS_FILE = join(process.cwd(), 'temp-jobs.json')

function loadJobs(): { [key: string]: MockJob } {
  try {
    if (existsSync(JOBS_FILE)) {
      const data = readFileSync(JOBS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('ジョブファイル読み込みエラー:', error)
  }
  return {}
}

function saveJobs(jobs: { [key: string]: MockJob }) {
  try {
    writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2))
  } catch (error) {
    console.error('ジョブファイル保存エラー:', error)
  }
}

export function createMockJob(newsId: string, userId: string): string {
  const jobId = Math.random().toString(36).substring(2, 15)
  const jobs = loadJobs()
  
  jobs[jobId] = {
    id: jobId,
    status: 'pending',
    newsId,
    userId,
    createdAt: new Date().toISOString(),
    progress: 10,
    message: '記事生成を開始しています...'
  }
  
  saveJobs(jobs)
  
  // 5秒後に処理中に変更
  setTimeout(() => {
    const updatedJobs = loadJobs()
    if (updatedJobs[jobId]) {
      updatedJobs[jobId].status = 'processing'
      updatedJobs[jobId].processedAt = new Date().toISOString()
      updatedJobs[jobId].progress = 60
      updatedJobs[jobId].message = 'AI が記事を生成中です...'
      saveJobs(updatedJobs)
    }
  }, 5000)
  
  // 15秒後に完了に変更
  setTimeout(() => {
    const finalJobs = loadJobs()
    if (finalJobs[jobId]) {
      finalJobs[jobId].status = 'completed'
      finalJobs[jobId].completedAt = new Date().toISOString()
      finalJobs[jobId].progress = 100
      finalJobs[jobId].message = '記事生成が完了しました！'
      finalJobs[jobId].article = {
        id: `article-${jobId}`,
        title: `生成された記事: ${newsId}`,
        summary: 'AI によって生成されたテスト記事です。',
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
        url: `/articles/article-${jobId}`
      }
      saveJobs(finalJobs)
    }
  }, 15000)
  
  return jobId
}

export function getMockJob(jobId: string): MockJob | null {
  const jobs = loadJobs()
  return jobs[jobId] || null
}

export function getAllMockJobs(): MockJob[] {
  const jobs = loadJobs()
  return Object.values(jobs)
}