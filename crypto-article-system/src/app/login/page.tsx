'use client'

// 動的レンダリングを強制（プリレンダリングエラー回避）
export const dynamic = 'force-dynamic'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Lock, Mail, LogIn, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuthStore()
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loginError, setLoginError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // エラーをクリア
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    if (loginError) {
      setLoginError('')
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'メールアドレスが必要です'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください'
    }

    if (!formData.password) {
      newErrors.password = 'パスワードが必要です'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    if (!validateForm()) {
      return
    }

    try {
      await login(formData.email, formData.password)
      router.push('/market') // ログイン成功後にメイン画面へ
    } catch (error: any) {
      if (error.response?.status === 401) {
        setLoginError('メールアドレスまたはパスワードが正しくありません')
      } else if (error.response?.status === 423) {
        setLoginError('アカウントがロックされています。30分後に再試行してください。')
      } else if (error.response?.status === 429) {
        setLoginError('ログイン試行回数が上限に達しました。しばらくお待ちください。')
      } else {
        setLoginError('ログインに失敗しました。しばらくしてから再試行してください。')
      }
    }
  }

  return (
    <div className="min-h-screen bg-neural-void flex items-center justify-center p-4">
      {/* Aurora Background */}
      <div className="neural-aurora" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold neural-title neural-glow-text mb-2">
            Crypto Article System
          </h1>
          <p className="text-neural-text-secondary">
            暗号通貨記事自動生成システムにログイン
          </p>
        </div>

        <NeuralCard>
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <LogIn className="h-5 w-5 text-neural-cyan" />
              ログイン
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {loginError && (
              <Alert className="border-neural-error bg-neural-error/10">
                <AlertCircle className="h-4 w-4 text-neural-error" />
                <AlertDescription className="text-neural-error">
                  {loginError}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium neural-title">
                  メールアドレス
                </Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neural-text-muted" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={cn(
                      "pl-10 neural-neumorphic-inset border-0",
                      errors.email && "ring-2 ring-neural-error"
                    )}
                    placeholder="your@email.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-neural-error mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium neural-title">
                  パスワード
                </Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neural-text-muted" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    className={cn(
                      "pl-10 pr-10 neural-neumorphic-inset border-0",
                      errors.password && "ring-2 ring-neural-error"
                    )}
                    placeholder="パスワードを入力"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neural-text-muted hover:text-neural-text-primary"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-neural-error mt-1">{errors.password}</p>
                )}
              </div>

              <NeuralButton
                type="submit"
                className="w-full neural-gradient-primary text-white border-0"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ログイン中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    ログイン
                  </div>
                )}
              </NeuralButton>
            </form>

            <div className="text-center space-y-4">
              <div className="text-sm text-neural-text-muted">
                アカウントをお持ちでない方は
              </div>
              
              <Link href="/register">
                <NeuralButton
                  variant="outline"
                  className="w-full neural-button"
                >
                  新規登録
                </NeuralButton>
              </Link>
            </div>
          </CardContent>
        </NeuralCard>

        <div className="text-center mt-6 text-xs text-neural-text-muted">
          <p>このシステムは認証が必要です</p>
          <p className="mt-1">セキュアな接続でデータを保護しています</p>
        </div>
      </div>
    </div>
  )
}