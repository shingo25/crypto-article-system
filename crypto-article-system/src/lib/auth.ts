import { verify } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface AuthUser {
  userId: string;
  email: string;
  username: string;
  role: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
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
      select: { isActive: true }
    });

    if (!user || !user.isActive) {
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