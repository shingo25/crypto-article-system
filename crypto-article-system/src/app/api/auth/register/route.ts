import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withRateLimit } from '@/lib/rate-limit';

const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  username: z.string().min(3, 'ユーザー名は3文字以上で入力してください').max(20, 'ユーザー名は20文字以下で入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

async function registerHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // メールアドレス・ユーザー名の重複チェック
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { username: validatedData.username }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { 
          error: existingUser.email === validatedData.email 
            ? 'このメールアドレスは既に使用されています' 
            : 'このユーザー名は既に使用されています'
        },
        { status: 409 }
      );
    }

    // パスワードをハッシュ化
    const hashedPassword = await hash(validatedData.password, 12);

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        username: validatedData.username,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: 'USER', // デフォルトはUSER
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      message: 'ユーザー登録が完了しました',
      user
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'ユーザー登録に失敗しました' },
      { status: 500 }
    );
  }
}

// レート制限を適用してエクスポート
export const POST = withRateLimit(registerHandler, 'auth');