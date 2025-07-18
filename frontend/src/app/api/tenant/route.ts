import { NextRequest, NextResponse } from 'next/server'
import { tenantManager } from '@/lib/tenant'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'

const componentLogger = createComponentLogger('TenantAPI')

// テナント情報取得
export async function GET(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId')
    
    if (!tenantId) {
      // 現在のドメインからテナントを取得
      const tenant = await tenantManager.getTenantFromDomain(request.headers.get('host') || '')
      
      if (!tenant) {
        throw new AppError('Tenant not found', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'TENANT_NOT_FOUND',
          statusCode: 404,
          userMessage: 'テナントが見つかりません'
        })
      }

      componentLogger.performance('テナント取得', Date.now() - startTime, {
        tenantId: tenant.id,
        method: 'domain'
      })

      return NextResponse.json({
        success: true,
        data: tenant
      })
    } else {
      // テナントIDから取得
      const context = await tenantManager.getTenantContext(tenantId)

      componentLogger.performance('テナント取得', Date.now() - startTime, {
        tenantId,
        method: 'id'
      })

      return NextResponse.json({
        success: true,
        data: context.tenant
      })
    }
  } catch (error) {
    componentLogger.error('テナント取得に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to get tenant', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'テナント情報の取得に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// テナント作成
export async function POST(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { slug, name, displayName, email, plan } = body

    // バリデーション
    if (!slug || !name || !displayName || !email) {
      throw new AppError('Missing required fields', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_FIELDS',
        statusCode: 400,
        userMessage: '必須フィールドが不足しています'
      })
    }

    // スラッグのバリデーション
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new AppError('Invalid slug format', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'INVALID_SLUG',
        statusCode: 400,
        userMessage: 'URLには小文字英数字とハイフンのみ使用できます'
      })
    }

    componentLogger.info('テナント作成を開始', { slug, plan })

    const tenant = await tenantManager.createTenant({
      slug,
      name,
      displayName,
      email,
      plan
    })

    componentLogger.business('テナント作成完了', {
      tenantId: tenant.id,
      slug: tenant.slug,
      plan: tenant.subscription.plan,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: tenant
    })

  } catch (error) {
    componentLogger.error('テナント作成に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to create tenant', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'テナントの作成に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// テナント更新
export async function PATCH(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { tenantId, settings, branding } = body

    if (!tenantId) {
      throw new AppError('Tenant ID required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_TENANT_ID',
        statusCode: 400,
        userMessage: 'テナントIDが必要です'
      })
    }

    componentLogger.info('テナント更新を開始', { tenantId })

    let updatedTenant

    if (settings) {
      updatedTenant = await tenantManager.updateTenantSettings(tenantId, settings)
    }

    if (branding) {
      updatedTenant = await tenantManager.updateTenantBranding(tenantId, branding)
    }

    componentLogger.business('テナント更新完了', {
      tenantId,
      updatedFields: [...(settings ? ['settings'] : []), ...(branding ? ['branding'] : [])],
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: updatedTenant
    })

  } catch (error) {
    componentLogger.error('テナント更新に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to update tenant', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'テナントの更新に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}