import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    const user = await verifyAuth(_request);
    
    if (!user) {
      return new Response(JSON.stringify({ error: '認証が必要です' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 最新のユーザー情報を取得
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
      }
    });

    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'ユーザーが見つかりません' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ user: currentUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    return new Response(JSON.stringify({ error: 'ユーザー情報の取得に失敗しました' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}