import { NextResponse } from 'next/server'
import { simpleQueueManager } from '@/lib/queue-simple'

export async function GET() {
  const stats = simpleQueueManager.getStats()
  const allJobs = simpleQueueManager.getAllJobs()
  
  return NextResponse.json({
    success: true,
    data: {
      stats,
      jobs: allJobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        processedAt: job.processedAt,
        error: job.error
      }))
    }
  })
}