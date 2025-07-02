import { verify } from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface AuthUser {
  userId: string;
  email: string;
  username: string;
  role: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not configured');
      return null;
    }

    const payload = verify(token, jwtSecret) as AuthUser;
    
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
    console.error('Auth verification failed:', error);
    return null;
  }
}

export function requireAuth(handler: (request: NextRequest, user: AuthUser) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await verifyAuth(request);
    
    if (!user) {
      return new Response(JSON.stringify({ error: '認証が必要です' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return handler(request, user);
  };
}

export function requireRole(roles: string[]) {
  return function(handler: (request: NextRequest, user: AuthUser) => Promise<Response>) {
    return async (request: NextRequest) => {
      const user = await verifyAuth(request);
      
      if (!user) {
        return new Response(JSON.stringify({ error: '認証が必要です' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!roles.includes(user.role)) {
        return new Response(JSON.stringify({ error: 'アクセス権限がありません' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return handler(request, user);
    };
  };
}