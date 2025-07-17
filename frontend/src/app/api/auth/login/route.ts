import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withRateLimit } from '@/lib/rate-limit';
import { createErrorResponse, AuthenticationError } from '@/lib/error-handler';
import { generateDoubleSubmitToken } from '@/lib/csrf';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

async function loginHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // ユーザー検索
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      }
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials', { email });
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is inactive', { email, userId: user.id });
    }

    // パスワード検証
    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid credentials', { email });
    }

    // JWT生成
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    // CSRFトークン生成
    const csrfToken = generateDoubleSubmitToken(user.id);

    const token = sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        csrfSecret: csrfToken // CSRFシークレットをJWTに含める
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // ログイン時刻を更新
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // レスポンス作成
    const response = NextResponse.json({
      message: 'ログインに成功しました',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      }
    });

    // HttpOnly Cookieとしてトークンを設定
    // 開発環境では__Host-プレフィックスを使用しない（secureが必須のため）
    const cookieName = process.env.NODE_ENV === 'production' ? '__Host-auth-token' : 'auth-token';
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7日間
      path: '/',
    });

    // CSRFトークンをクライアントが読み取り可能なCookieとして設定
    response.cookies.set('XSRF-TOKEN', csrfToken, {
      httpOnly: false, // JavaScriptから読み取り可能
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7日間
      path: '/',
    });

    return response;

  } catch (error) {
    return createErrorResponse(error, { operation: 'login' });
  }
}

// レート制限を適用してエクスポート
export const POST = withRateLimit(loginHandler, 'auth');