'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        toast.success('ログインしました');
        router.push('/dashboard');
      } else {
        toast.error(result.error || 'ログインに失敗しました');
      }
    } catch (error) {
      toast.error('ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neural-bg-primary via-neural-bg-secondary to-neural-bg-tertiary">
      <Card className="w-full max-w-md p-8 bg-neural-surface/80 backdrop-blur-sm border-neural-elevated">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neural-text-primary mb-2">
            ログイン
          </h1>
          <p className="text-neural-text-secondary">
            Crypto Article Systemにアクセス
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-neural-text-primary">
              メールアドレス
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-neural-bg-primary border-neural-elevated"
              placeholder="your@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-neural-text-primary">
              パスワード
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-neural-bg-primary border-neural-elevated"
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neural-accent hover:bg-neural-accent/90"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-neural-text-secondary">
            アカウントをお持ちでないですか？{' '}
            <button
              onClick={() => router.push('/register')}
              className="text-neural-accent hover:underline"
            >
              新規登録
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}