import { NextRequest, NextResponse } from 'next/server'
import { tenantManager } from '@/lib/tenant'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'

const componentLogger = createComponentLogger('TenantStatsAPI')

// テナント統計情報取得
export async function GET(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      throw new AppError('Tenant ID required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_TENANT_ID',
        statusCode: 400,
        userMessage: 'テナントIDが必要です'
      })
    }

    componentLogger.info('テナント統計を取得中', { tenantId })

    // テナントの存在確認
    const context = await tenantManager.getTenantContext(tenantId)
    
    // 統計情報を取得
    const stats = await tenantManager.getTenantStats(tenantId)
    
    // 使用量情報
    const { subscription } = context.tenant
    const usagePercentage = {
      articles: subscription.limits.monthlyArticles > 0 
        ? (subscription.usage.articlesCreated / subscription.limits.monthlyArticles) * 100 
        : 0,
      api: subscription.limits.monthlyApiCalls > 0
        ? (subscription.usage.apiCallsMade / subscription.limits.monthlyApiCalls) * 100
        : 0,
      storage: subscription.limits.storage > 0
        ? (subscription.usage.storageUsed / subscription.limits.storage) * 100
        : 0
    }

    componentLogger.performance('テナント統計取得', Date.now() - startTime, {
      tenantId
    })

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: context.tenant.id,
          name: context.tenant.displayName,
          plan: subscription.plan,
          status: subscription.status
        },
        stats,
        usage: {
          current: subscription.usage,
          limits: subscription.limits,
          percentage: usagePercentage
        },
        features: context.tenant.features
      }
    })

  } catch (error) {
    componentLogger.error('テナント統計取得に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to get tenant stats', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'テナント統計の取得に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}