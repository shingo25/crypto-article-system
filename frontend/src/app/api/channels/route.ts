import { NextRequest, NextResponse } from 'next/server'
import { contentDistributionManager } from '@/lib/content-distribution'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'

const componentLogger = createComponentLogger('ChannelsAPI')

// 配信チャンネル一覧取得
export async function GET(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId')
    const type = searchParams.get('type')
    const active = searchParams.get('active')

    if (!tenantId) {
      throw new AppError('Tenant ID is required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_TENANT_ID',
        statusCode: 400,
        userMessage: 'テナントIDが必要です'
      })
    }

    componentLogger.info('配信チャンネル一覧を取得中', { tenantId, type, active })

    // 実際の実装では、データベースから取得
    // ここでは仮のデータを返す
    const mockChannels = [
      {
        id: 'channel_webhook_1',
        tenantId,
        name: 'Main Website Webhook',
        type: 'webhook',
        config: {
          url: 'https://example.com/webhook/content',
          method: 'POST',
          authType: 'bearer'
        },
        isActive: true,
        lastSync: '2024-12-20T10:30:00Z',
        syncStats: {
          totalSent: 245,
          successCount: 240,
          errorCount: 5,
          lastError: null
        },
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-20T10:30:00Z'
      },
      {
        id: 'channel_rss_1',
        tenantId,
        name: 'Public RSS Feed',
        type: 'rss',
        config: {
          title: 'Crypto News Feed',
          description: 'Latest cryptocurrency news and analysis',
          link: 'https://example.com/rss'
        },
        isActive: true,
        lastSync: '2024-12-20T12:00:00Z',
        syncStats: {
          totalSent: 156,
          successCount: 156,
          errorCount: 0,
          lastError: null
        },
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-20T12:00:00Z'
      },
      {
        id: 'channel_email_1',
        tenantId,
        name: 'Newsletter Subscribers',
        type: 'email',
        config: {
          recipients: ['subscribers@example.com'],
          template: 'newsletter',
          subject: 'Weekly Crypto Update'
        },
        isActive: true,
        lastSync: '2024-12-19T09:00:00Z',
        syncStats: {
          totalSent: 48,
          successCount: 47,
          errorCount: 1,
          lastError: 'Invalid email address'
        },
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-19T09:00:00Z'
      }
    ]

    let filteredChannels = mockChannels

    // フィルタリング
    if (type) {
      filteredChannels = filteredChannels.filter(channel => channel.type === type)
    }
    if (active !== null) {
      const isActive = active === 'true'
      filteredChannels = filteredChannels.filter(channel => channel.isActive === isActive)
    }

    componentLogger.performance('配信チャンネル一覧取得', Date.now() - startTime, {
      tenantId,
      resultCount: filteredChannels.length
    })

    return NextResponse.json({
      success: true,
      data: filteredChannels,
      meta: {
        total: filteredChannels.length,
        filters: { type, active },
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    componentLogger.error('配信チャンネル一覧取得に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to fetch channels', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: '配信チャンネル一覧の取得に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// 配信チャンネル作成
export async function POST(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { tenantId, name, type, config, isActive = true } = body

    // バリデーション
    if (!tenantId || !name || !type || !config) {
      throw new AppError('Missing required fields', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_REQUIRED_FIELDS',
        statusCode: 400,
        userMessage: '必須フィールドが不足しています'
      })
    }

    if (!['webhook', 'rss', 'email', 'api'].includes(type)) {
      throw new AppError('Invalid channel type', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'INVALID_CHANNEL_TYPE',
        statusCode: 400,
        userMessage: '無効なチャンネルタイプです'
      })
    }

    componentLogger.info('配信チャンネルを作成中', { tenantId, name, type })

    const channelData = {
      name,
      type,
      config,
      isActive
    }

    const newChannel = await contentDistributionManager.createDistributionChannel(
      tenantId,
      channelData
    )

    componentLogger.business('配信チャンネル作成完了', {
      channelId: newChannel.id,
      name: newChannel.name,
      type: newChannel.type,
      tenantId,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: newChannel
    })

  } catch (error) {
    componentLogger.error('配信チャンネル作成に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to create channel', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: '配信チャンネルの作成に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}