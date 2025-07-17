import { PrismaClient } from '@/generated/prisma'

/**
 * テナント分離のためのPrismaミドルウェア
 * 全てのクエリに organizationId の制約を自動的に付与
 */

// 現在のリクエストコンテキストでのorganizationId
let currentOrganizationId: string | null = null

/**
 * 現在のorganizationIdを設定
 * リクエストの開始時に呼び出す
 */
export function setCurrentOrganizationId(organizationId: string) {
  currentOrganizationId = organizationId
}

/**
 * 現在のorganizationIdを取得
 */
export function getCurrentOrganizationId(): string | null {
  return currentOrganizationId
}

/**
 * organizationIdが必要なモデル一覧
 */
const TENANT_AWARE_MODELS = [
  'Article',
  'Template', 
  'AIProviderSettings',
  'AlertSettings',
  'ArticleAnalytics'
] as const

/**
 * Prismaクライアントにテナント分離ミドルウェアを適用
 * @param prisma Prismaクライアントインスタンス
 */
export function applyTenantMiddleware(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    const orgId = getCurrentOrganizationId()
    
    // organizationIdが設定されていない場合はエラー
    if (!orgId && TENANT_AWARE_MODELS.includes(params.model as any)) {
      throw new Error(`Organization context is required for ${params.model} operations`)
    }

    // テナント対応モデルの場合、organizationId制約を追加
    if (orgId && TENANT_AWARE_MODELS.includes(params.model as any)) {
      
      // CREATE操作: organizationIdを自動設定
      if (params.action === 'create') {
        if (params.args.data) {
          params.args.data.organizationId = orgId
        }
      }
      
      // UPSERT操作: create/updateの両方にorganizationIdを設定
      else if (params.action === 'upsert') {
        if (params.args.create) {
          params.args.create.organizationId = orgId
        }
        if (params.args.update) {
          params.args.update.organizationId = orgId
        }
        // where条件にもorganizationIdを追加
        if (params.args.where) {
          params.args.where.organizationId = orgId
        }
      }
      
      // UPDATE操作: where条件にorganizationIdを追加
      else if (params.action === 'update' || params.action === 'updateMany') {
        if (params.args.where) {
          params.args.where.organizationId = orgId
        } else {
          params.args.where = { organizationId: orgId }
        }
      }
      
      // DELETE操作: where条件にorganizationIdを追加
      else if (params.action === 'delete' || params.action === 'deleteMany') {
        if (params.args.where) {
          params.args.where.organizationId = orgId
        } else {
          params.args.where = { organizationId: orgId }
        }
      }
      
      // FIND操作: where条件にorganizationIdを追加
      else if (
        params.action === 'findFirst' || 
        params.action === 'findUnique' || 
        params.action === 'findUniqueOrThrow' ||
        params.action === 'findMany'
      ) {
        if (params.args?.where) {
          params.args.where.organizationId = orgId
        } else {
          if (!params.args) params.args = {}
          params.args.where = { organizationId: orgId }
        }
      }
      
      // COUNT操作: where条件にorganizationIdを追加
      else if (params.action === 'count') {
        if (params.args?.where) {
          params.args.where.organizationId = orgId
        } else {
          if (!params.args) params.args = {}
          params.args.where = { organizationId: orgId }
        }
      }
      
      // AGGREGATE操作: where条件にorganizationIdを追加
      else if (params.action === 'aggregate') {
        if (params.args?.where) {
          params.args.where.organizationId = orgId
        } else {
          if (!params.args) params.args = {}
          params.args.where = { organizationId: orgId }
        }
      }
    }

    return next(params)
  })
}

/**
 * リクエスト終了時にorganizationIdをクリア
 */
export function clearCurrentOrganizationId() {
  currentOrganizationId = null
}

/**
 * 指定されたorganizationIdで処理を実行するヘルパー関数
 * @param organizationId 実行時のorganizationId
 * @param fn 実行する関数
 * @returns 関数の戻り値
 */
export async function withOrganizationContext<T>(
  organizationId: string,
  fn: () => Promise<T>
): Promise<T> {
  const previousOrgId = getCurrentOrganizationId()
  
  try {
    setCurrentOrganizationId(organizationId)
    return await fn()
  } finally {
    if (previousOrgId) {
      setCurrentOrganizationId(previousOrgId)
    } else {
      clearCurrentOrganizationId()
    }
  }
}

/**
 * ユーザーの所属組織を検証
 * @param userId ユーザーID
 * @param organizationId 組織ID
 * @param prisma Prismaクライアント
 * @returns 所属しているかどうか
 */
export async function validateUserOrganizationAccess(
  userId: string,
  organizationId: string,
  prisma: PrismaClient
): Promise<boolean> {
  try {
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        userId,
        organizationId,
        isActive: true
      }
    })
    
    return !!membership
  } catch (error) {
    console.error('Failed to validate user organization access:', error)
    return false
  }
}

/**
 * ユーザーの組織内での権限を取得
 * @param userId ユーザーID
 * @param organizationId 組織ID
 * @param prisma Prismaクライアント
 * @returns ユーザーの権限
 */
export async function getUserOrganizationRole(
  userId: string,
  organizationId: string,
  prisma: PrismaClient
): Promise<string | null> {
  try {
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        userId,
        organizationId,
        isActive: true
      },
      select: {
        role: true
      }
    })
    
    return membership?.role || null
  } catch (error) {
    console.error('Failed to get user organization role:', error)
    return null
  }
}