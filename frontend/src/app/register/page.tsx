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
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Eye, EyeOff, Lock, Mail, UserPlus, AlertCircle, 
  Check, X, User, Shield 
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading } = useAuthStore()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    acceptTerms: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [registerError, setRegisterError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
    
    // エラーをクリア
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    if (registerError) {
      setRegisterError('')
    }
  }

  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password)
    }
    return requirements
  }

  const passwordRequirements = validatePassword(formData.password)
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'メールアドレスが必要です'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください'
    }

    if (!formData.fullName) {
      newErrors.fullName = '名前が必要です'
    } else if (formData.fullName.length < 2) {
      newErrors.fullName = '名前は2文字以上で入力してください'
    }

    if (!formData.password) {
      newErrors.password = 'パスワードが必要です'
    } else if (!isPasswordValid) {
      newErrors.password = 'パスワードの要件を満たしていません'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワードの確認が必要です'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません'
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = '利用規約に同意してください'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegisterError('')

    if (!validateForm()) {
      return
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName
      })
      
      // 登録成功後にログイン画面へリダイレクト
      router.push('/login?message=registration_success')
    } catch (error: any) {
      if (error.response?.status === 400) {
        const detail = error.response?.data?.detail
        if (detail?.includes('メールアドレス')) {
          setRegisterError('このメールアドレスは既に登録されています')
        } else if (detail?.includes('パスワード')) {
          setRegisterError('パスワードの要件を満たしていません')
        } else {
          setRegisterError(detail || '入力内容に問題があります')
        }
      } else if (error.response?.status === 429) {
        setRegisterError('登録試行回数が上限に達しました。しばらくお待ちください。')
      } else {
        setRegisterError('登録に失敗しました。しばらくしてから再試行してください。')
      }
    }
  }

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className={cn(
      "flex items-center gap-2 text-xs",
      met ? "text-neural-success" : "text-neural-text-muted"
    )}>
      {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{text}</span>
    </div>
  )

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
            暗号通貨記事自動生成システムに新規登録
          </p>
        </div>

        <NeuralCard>
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <UserPlus className="h-5 w-5 text-neural-success" />
              新規登録
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {registerError && (
              <Alert className="border-neural-error bg-neural-error/10">
                <AlertCircle className="h-4 w-4 text-neural-error" />
                <AlertDescription className="text-neural-error">
                  {registerError}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="text-sm font-medium neural-title">
                  お名前
                </Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neural-text-muted" />
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={cn(
                      "pl-10 neural-neumorphic-inset border-0",
                      errors.fullName && "ring-2 ring-neural-error"
                    )}
                    placeholder="山田 太郎"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-xs text-neural-error mt-1">{errors.fullName}</p>
                )}
              </div>

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
                
                {/* パスワード要件 */}
                {formData.password && (
                  <div className="mt-2 p-3 bg-neural-surface rounded-lg space-y-1">
                    <div className="text-xs font-medium text-neural-text-secondary mb-1">
                      パスワード要件:
                    </div>
                    <PasswordRequirement met={passwordRequirements.length} text="8文字以上" />
                    <PasswordRequirement met={passwordRequirements.uppercase} text="大文字を含む" />
                    <PasswordRequirement met={passwordRequirements.lowercase} text="小文字を含む" />
                    <PasswordRequirement met={passwordRequirements.number} text="数字を含む" />
                  </div>
                )}
                
                {errors.password && (
                  <p className="text-xs text-neural-error mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium neural-title">
                  パスワード確認
                </Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neural-text-muted" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={cn(
                      "pl-10 pr-10 neural-neumorphic-inset border-0",
                      errors.confirmPassword && "ring-2 ring-neural-error"
                    )}
                    placeholder="パスワードを再入力"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neural-text-muted hover:text-neural-text-primary"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-neural-error mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="acceptTerms"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => {
                    const newChecked = checked === true
                    setFormData(prev => ({ ...prev, acceptTerms: newChecked }))
                    // エラーをクリア
                    if (errors.acceptTerms && newChecked) {
                      setErrors(prev => ({ ...prev, acceptTerms: '' }))
                    }
                  }}
                  className={cn(
                    "mt-1 flex-shrink-0",
                    errors.acceptTerms && "ring-2 ring-neural-error"
                  )}
                />
                <div className="grid gap-1.5 leading-none flex-1">
                  <Label
                    htmlFor="acceptTerms"
                    className={cn(
                      "text-sm font-medium leading-relaxed cursor-pointer text-neural-text-primary hover:text-neural-cyan transition-colors",
                      "peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    )}
                    onClick={() => {
                      const newChecked = !formData.acceptTerms
                      setFormData(prev => ({ ...prev, acceptTerms: newChecked }))
                      if (errors.acceptTerms && newChecked) {
                        setErrors(prev => ({ ...prev, acceptTerms: '' }))
                      }
                    }}
                  >
                    利用規約とプライバシーポリシーに同意します
                  </Label>
                </div>
              </div>
              {errors.acceptTerms && (
                <p className="text-xs text-neural-error">{errors.acceptTerms}</p>
              )}

              <NeuralButton
                type="submit"
                className="w-full neural-gradient-success text-white border-0"
                disabled={isLoading || !isPasswordValid}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    登録中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    新規登録
                  </div>
                )}
              </NeuralButton>
            </form>

            <div className="text-center space-y-4">
              <div className="text-sm text-neural-text-muted">
                既にアカウントをお持ちの方は
              </div>
              
              <Link href="/login">
                <NeuralButton
                  variant="outline"
                  className="w-full neural-button"
                >
                  ログイン
                </NeuralButton>
              </Link>
            </div>
          </CardContent>
        </NeuralCard>

        <div className="text-center mt-6 text-xs text-neural-text-muted">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-4 w-4" />
            <span>セキュアな登録システム</span>
          </div>
          <p>すべてのデータは暗号化されて保護されます</p>
        </div>
      </div>
    </div>
  )
}