'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await register(formData);
      
      if (result.success) {
        toast.success('ユーザー登録が完了しました。ログインページに移動します。');
        router.push('/login');
      } else {
        toast.error(result.error || 'ユーザー登録に失敗しました');
      }
    } catch (error) {
      toast.error('ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neural-bg-primary via-neural-bg-secondary to-neural-bg-tertiary">
      <Card className="w-full max-w-md p-8 bg-neural-surface/80 backdrop-blur-sm border-neural-elevated">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neural-text-primary mb-2">
            新規登録
          </h1>
          <p className="text-neural-text-secondary">
            Crypto Article Systemのアカウントを作成
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-neural-text-primary">
                名前
              </Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className="bg-neural-bg-primary border-neural-elevated"
                placeholder="太郎"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-neural-text-primary">
                姓
              </Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className="bg-neural-bg-primary border-neural-elevated"
                placeholder="田中"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-neural-text-primary">
              ユーザー名 *
            </Label>
            <Input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
              className="bg-neural-bg-primary border-neural-elevated"
              placeholder="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-neural-text-primary">
              メールアドレス *
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="bg-neural-bg-primary border-neural-elevated"
              placeholder="your@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-neural-text-primary">
              パスワード *
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="bg-neural-bg-primary border-neural-elevated"
              placeholder="••••••••"
            />
            <p className="text-xs text-neural-text-secondary">
              8文字以上で入力してください
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neural-accent hover:bg-neural-accent/90"
          >
            {isLoading ? '登録中...' : 'アカウント作成'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-neural-text-secondary">
            既にアカウントをお持ちですか？{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-neural-accent hover:underline"
            >
              ログイン
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}