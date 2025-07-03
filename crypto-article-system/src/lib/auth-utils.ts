import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'

const logger = createLogger({ component: 'AuthUtils' })

export interface AuthUser {
  id: string
  email: string
  role: string
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
}

/**
 * 認証トークンを検証してユーザー情報を取得
 */
export async function validateAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Cookieから認証トークンを取得
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return {
        success: false,
        error: 'No authentication token'
      }
    }

    // JWTトークンを検証
    const payload = await verifyJWT(token)
    if (!payload || typeof payload.userId !== 'string') {
      return {
        success: false,
        error: 'Invalid token'
      }
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true
      }
    })

    if (!user) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    }
  } catch (error) {
    logger.error('認証検証エラー', error as Error)
    return {
      success: false,
      error: 'Authentication failed'
    }
  }
}

/**
 * 管理者権限をチェック
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const authResult = await validateAuth(request)
  
  if (!authResult.success) {
    return authResult
  }

  if (authResult.user?.role !== 'admin') {
    return {
      success: false,
      error: 'Admin access required'
    }
  }

  return authResult
}