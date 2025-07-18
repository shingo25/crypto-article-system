import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import { createSecurityAuditLog } from '@/lib/security-audit'
import { validateCSRFToken } from '@/lib/csrf'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import { JobStatus } from '@prisma/client'

const CreateJobSchema = z.object({
  templateId: z.string().cuid(),
  inputData: z.record(z.any()),
  priority: z.number().min(0).max(100).default(0)
})

// GET /api/ai/jobs - ジョブ一覧取得
export async function GET(_request: NextRequest) {
  try {
    const user = await verifyAuth(_request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    if (!user.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as JobStatus | null
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {
      organizationId: user.organizationId
    }

    if (status && Object.values(JobStatus).includes(status)) {
      where.status = status
    }

    const [jobs, total] = await Promise.all([
      prisma.articleGenerationJob.findMany({
        where,
        include: {
          template: {
            select: {
              id: true,
              name: true,
              category: true
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          article: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset
      }),
      prisma.articleGenerationJob.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    })

  } catch (error) {
    console.error('Jobs fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/ai/jobs - 新しいジョブ作成
export async function POST(_request: NextRequest) {
  try {
    const user = await verifyAuth(_request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    if (!user.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    // CSRF保護（開発環境では無効化）
    if (process.env.NODE_ENV !== 'development') {
      const csrfValidation = await validateCSRFToken(request)
      if (!csrfValidation.valid) {
        console.error('[CSRF] Validation failed:', csrfValidation.reason)
        return NextResponse.json({ 
          error: 'CSRF token invalid', 
          reason: csrfValidation.reason 
        }, { status: 403 })
      }
    } else {
      console.log('[CSRF] Skipping CSRF validation in development mode')
    }

    // レート制限（開発環境では無効化）
    if (process.env.NODE_ENV !== 'development') {
      const rateLimitResult = await rateLimit(request, 'ai-jobs-create', 30, 60000)
      if (!rateLimitResult.success) {
      await createSecurityAuditLog({
        organizationId: user.organizationId,
        userId: user.userId,
        eventType: 'RATE_LIMIT_EXCEEDED',
        severity: 'warning',
        description: 'Rate limit exceeded for job creation',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })

      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const body = await request.json()
    const validation = CreateJobSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid job data',
        details: validation.error.issues
      }, { status: 400 })
    }

    const data = validation.data

    // テンプレート存在確認とアクセス権チェック
    const template = await prisma.aITemplate.findFirst({
      where: {
        id: data.templateId,
        organizationId: user.organizationId,
        isActive: true
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found or inactive' }, { status: 404 })
    }

    // テンプレートのレート制限チェック
    if (template.rateLimit) {
      const recentJobs = await prisma.articleGenerationJob.count({
        where: {
          templateId: template.id,
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // 1時間以内
          }
        }
      })

      if (recentJobs >= template.rateLimit) {
        return NextResponse.json({ 
          error: 'Template rate limit exceeded',
          limit: template.rateLimit,
          current: recentJobs
        }, { status: 429 })
      }
    }

    // 入力データのセキュリティチェック
    const inputDataString = JSON.stringify(data.inputData)
    const suspiciousPatterns = [
      /ignore\s+previous\s+instructions/i,
      /system\s*:\s*you\s+are/i,
      /\[SYSTEM\]/i,
      /forget\s+everything/i,
      /<script/i,
      /javascript:/i
    ]

    const suspiciousContent = suspiciousPatterns.some(pattern => pattern.test(inputDataString))

    if (suspiciousContent) {
      await createSecurityAuditLog({
        organizationId: user.organizationId,
        userId: user.userId,
        eventType: 'SUSPICIOUS_PROMPT',
        severity: 'warning',
        description: 'Suspicious content detected in job input data',
        metadata: {
          templateId: template.id,
          templateName: template.name,
          inputDataLength: inputDataString.length
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })

      return NextResponse.json({
        error: 'Job input contains suspicious patterns'
      }, { status: 400 })
    }

    // プロンプト生成（テンプレートの変数置換）
    let finalPrompt = template.userPrompt
    for (const [key, value] of Object.entries(data.inputData)) {
      const placeholder = `{{${key}}}`
      finalPrompt = finalPrompt.replace(new RegExp(placeholder, 'g'), String(value))
    }

    // ジョブ作成
    const job = await prisma.articleGenerationJob.create({
      data: {
        organizationId: user.organizationId,
        templateId: template.id,
        userId: user.userId,
        status: JobStatus.PENDING,
        priority: data.priority,
        inputData: data.inputData,
        prompt: finalPrompt,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      }
    })

    // セキュリティログ記録
    await createSecurityAuditLog({
      organizationId: user.organizationId,
      userId: user.userId,
      eventType: 'JOB_CREATED',
      severity: 'info',
      description: `Article generation job created with template: ${template.name}`,
      resourceId: job.id,
      resourceType: 'ArticleGenerationJob',
      metadata: {
        templateId: template.id,
        templateName: template.name,
        priority: job.priority,
        inputDataKeys: Object.keys(data.inputData)
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    // BullMQキューにジョブを追加（セキュア実装）
    const { addSecureJob } = await import('@/lib/queue')
    await addSecureJob(user.organizationId, job.id, job.priority)

    return NextResponse.json({
      success: true,
      data: { job }
    })

  } catch (error) {
    console.error('Job creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}