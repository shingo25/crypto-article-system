import { verify } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setCurrentOrganizationId, validateUserOrganizationAccess } from '@/lib/tenant-middleware';
import { isMFARequired, validateMFASetup } from '@/lib/mfa';

export interface AuthUser {
  userId: string;
  email: string;
  username: string;
  role: string;
  organizationId?: string;
  organizationRole?: string;
  mfaEnabled?: boolean;
}

export async function verifyAuth(
  request: NextRequest, 
  options?: { requireOrganization?: boolean; organizationId?: string }
): Promise<AuthUser | null> {
  try {
    // 開発環境では__Host-プレフィックスなしのCookie名を使用
    const cookieName = process.env.NODE_ENV === 'production' ? '__Host-auth-token' : 'auth-token';
    
    const token = request.cookies.get(cookieName)?.value;
    
    if (!token) {
      return null;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[AUTH] JWT_SECRET is not configured');
      return null;
    }

    const payload = verify(token, jwtSecret, {
      algorithms: ['HS256'] // アルゴリズム混同攻撃を防ぐため明示的に指定
    }) as AuthUser;
    
    // ユーザーが有効かチェック
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { 
        isActive: true,
        mfaEnabled: true,
        mfaSecret: true,
        memberships: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                settings: true
              }
            }
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    // MFA検証（必要な場合）
    if (user.memberships.length > 0) {
      const membership = user.memberships[0]; // 第一組織を使用
      const organizationRole = membership.role;
      const organizationSettings = membership.organization.settings;
      
      // MFAが必要かチェック
      if (isMFARequired(organizationRole, organizationSettings)) {
        if (!validateMFASetup(user.mfaEnabled, user.mfaSecret)) {
          // MFA設定が不完全な場合はMFA設定を促す
          console.warn(`[AUTH] MFA required but not configured for user ${payload.userId}`);
          return null;
        }
      }
      
      // 組織コンテキストを設定
      if (options?.organizationId) {
        // 指定された組織へのアクセス権を検証
        const hasAccess = await validateUserOrganizationAccess(
          payload.userId, 
          options.organizationId, 
          prisma
        );
        
        if (!hasAccess) {
          console.warn(`[AUTH] User ${payload.userId} does not have access to organization ${options.organizationId}`);
          return null;
        }
        
        setCurrentOrganizationId(options.organizationId);
        payload.organizationId = options.organizationId;
      } else if (user.memberships.length > 0) {
        // デフォルト組織を設定
        const defaultOrg = user.memberships[0].organization;
        setCurrentOrganizationId(defaultOrg.id);
        payload.organizationId = defaultOrg.id;
        payload.organizationRole = membership.role;
      }
    } else if (options?.requireOrganization) {
      // 組織が必要だが所属していない
      console.warn(`[AUTH] User ${payload.userId} has no organization membership`);
      return null;
    }

    return payload;
  } catch (error) {
    // セキュリティ上、詳細なエラー情報は出力しない
    console.error('[AUTH] Authentication failed');
    return null;
  }
}

export function requireAuth(handler: (request: NextRequest, user: AuthUser) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    return handler(request, user);
  };
}

export function requireRole(roles: string[]) {
  return function(handler: (request: NextRequest, user: AuthUser) => Promise<Response>) {
    return async (request: NextRequest) => {
      console.log('[AUTH] requireRole middleware called');
      const user = await verifyAuth(request);
      
      if (!user) {
        console.log('[AUTH] Authentication failed in requireRole');
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
      }

      if (!roles.includes(user.role)) {
        console.log('[AUTH] Role check failed:', user.role, 'not in', roles);
        return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
      }

      console.log('[AUTH] Role check passed, proceeding to handler');
      return handler(request, user);
    };
  };
}