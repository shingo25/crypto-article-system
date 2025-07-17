'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'
import {
  Shield,
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  X,
  Download,
  Upload,
  RefreshCw,
  Save,
  Settings,
  FileText,
  Database,
  Cloud,
  Zap,
  Globe,
  Server,
  Package,
  Terminal,
  HardDrive
} from 'lucide-react'

interface ConfigItem {
  key: string
  value: string
  description: string
  required: boolean
  sensitive: boolean
  category: 'api' | 'database' | 'cache' | 'services' | 'security' | 'system'
  validation?: {
    pattern?: string
    minLength?: number
    maxLength?: number
    allowEmpty?: boolean
  }
  lastModified?: string
  modifiedBy?: string
}

interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
  missing: string[]
}

interface EnvironmentCheck {
  name: string
  category: string
  status: 'success' | 'warning' | 'error'
  message: string
  details?: string
  recommendation?: string
}

const CONFIG_CATEGORIES = {
  api: { icon: Globe, label: 'API設定', color: 'text-blue-400' },
  database: { icon: Database, label: 'データベース', color: 'text-green-400' },
  cache: { icon: Zap, label: 'キャッシュ', color: 'text-yellow-400' },
  services: { icon: Server, label: 'サービス', color: 'text-purple-400' },
  security: { icon: Shield, label: 'セキュリティ', color: 'text-red-400' },
  system: { icon: Settings, label: 'システム', color: 'text-gray-400' }
}

export default function SecureConfigManager() {
  const [config, setConfig] = useState<Record<string, ConfigItem>>({})
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [envChecks, setEnvChecks] = useState<EnvironmentCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({})
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [newKeyData, setNewKeyData] = useState<Partial<ConfigItem>>({})

  // 設定を読み込み
  const loadConfig = async () => {
    try {
      setLoading(true)
      
      // モック設定データ
      const mockConfig: Record<string, ConfigItem> = {
        'OPENAI_API_KEY': {
          key: 'OPENAI_API_KEY',
          value: 'sk-...',
          description: 'OpenAI APIキー（記事生成用）',
          required: true,
          sensitive: true,
          category: 'api',
          validation: { pattern: '^sk-[a-zA-Z0-9]{48}$' },
          lastModified: '2025-01-01T10:00:00Z',
          modifiedBy: 'admin'
        },
        'DATABASE_URL': {
          key: 'DATABASE_URL',
          value: 'postgresql://user:pass@localhost:5432/cryptodb',
          description: 'データベース接続URL',
          required: true,
          sensitive: true,
          category: 'database',
          validation: { pattern: '^postgresql://.+' },
          lastModified: '2025-01-01T09:00:00Z',
          modifiedBy: 'admin'
        },
        'REDIS_URL': {
          key: 'REDIS_URL',
          value: 'redis://localhost:6379',
          description: 'Redis接続URL（キャッシュ用）',
          required: false,
          sensitive: false,
          category: 'cache',
          validation: { pattern: '^redis://.+' }
        },
        'JWT_SECRET': {
          key: 'JWT_SECRET',
          value: 'super-secret-jwt-key-256-bits',
          description: 'JWT署名用秘密鍵',
          required: true,
          sensitive: true,
          category: 'security',
          validation: { minLength: 32 }
        },
        'API_RATE_LIMIT': {
          key: 'API_RATE_LIMIT',
          value: '1000',
          description: 'API制限（リクエスト/時間）',
          required: false,
          sensitive: false,
          category: 'system',
          validation: { pattern: '^\\d+$' }
        },
        'ENCRYPTION_KEY': {
          key: 'ENCRYPTION_KEY',
          value: '',
          description: '暗号化キー（32バイト）',
          required: true,
          sensitive: true,
          category: 'security',
          validation: { minLength: 32, maxLength: 32 }
        }
      }

      try {
        const response = await apiClient.getSecureConfig()
        const transformedConfig: Record<string, ConfigItem> = {}
        
        Object.entries(response.config || {}).forEach(([key, value]) => {
          transformedConfig[key] = {
            key,
            value: value as string,
            description: mockConfig[key]?.description || '設定項目',
            required: mockConfig[key]?.required || false,
            sensitive: mockConfig[key]?.sensitive || false,
            category: mockConfig[key]?.category || 'system',
            validation: mockConfig[key]?.validation
          }
        })
        
        setConfig(transformedConfig)
      } catch (error) {
        console.warn('Using mock config data:', error)
        setConfig(mockConfig)
      }
      
    } catch (error) {
      console.error('Failed to load config:', error)
      toast.error('設定の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 環境チェックを実行
  const runEnvironmentChecks = async () => {
    try {
      const mockChecks: EnvironmentCheck[] = [
        {
          name: 'API キー設定',
          category: 'security',
          status: config['OPENAI_API_KEY']?.value ? 'success' : 'error',
          message: config['OPENAI_API_KEY']?.value ? 'OpenAI APIキーが設定されています' : 'OpenAI APIキーが未設定です',
          recommendation: !config['OPENAI_API_KEY']?.value ? 'APIキーを設定してください' : undefined
        },
        {
          name: 'データベース接続',
          category: 'database',
          status: config['DATABASE_URL']?.value ? 'success' : 'error',
          message: config['DATABASE_URL']?.value ? 'データベースURLが設定されています' : 'データベースURLが未設定です',
          recommendation: !config['DATABASE_URL']?.value ? 'データベース接続情報を設定してください' : undefined
        },
        {
          name: 'セキュリティ設定',
          category: 'security',
          status: config['JWT_SECRET']?.value && config['JWT_SECRET'].value.length >= 32 ? 'success' : 'warning',
          message: config['JWT_SECRET']?.value && config['JWT_SECRET'].value.length >= 32 
            ? 'JWT秘密鍵が適切に設定されています' 
            : 'JWT秘密鍵が短すぎるか未設定です',
          recommendation: !(config['JWT_SECRET']?.value && config['JWT_SECRET'].value.length >= 32) 
            ? '32文字以上の安全な秘密鍵を設定してください' : undefined
        },
        {
          name: '暗号化設定',
          category: 'security',
          status: config['ENCRYPTION_KEY']?.value && config['ENCRYPTION_KEY'].value.length === 32 ? 'success' : 'error',
          message: config['ENCRYPTION_KEY']?.value && config['ENCRYPTION_KEY'].value.length === 32
            ? '暗号化キーが適切に設定されています'
            : '暗号化キーが未設定または不正です',
          recommendation: !(config['ENCRYPTION_KEY']?.value && config['ENCRYPTION_KEY'].value.length === 32)
            ? '32バイトの暗号化キーを設定してください' : undefined
        },
        {
          name: 'キャッシュ設定',
          category: 'system',
          status: config['REDIS_URL']?.value ? 'success' : 'warning',
          message: config['REDIS_URL']?.value ? 'Redisが設定されています' : 'Redisが未設定です',
          details: config['REDIS_URL']?.value ? undefined : 'パフォーマンス向上のためRedisの設定を推奨します'
        },
        {
          name: 'レート制限',
          category: 'system',
          status: config['API_RATE_LIMIT']?.value ? 'success' : 'warning',
          message: config['API_RATE_LIMIT']?.value ? 'API制限が設定されています' : 'API制限が未設定です',
          details: !config['API_RATE_LIMIT']?.value ? 'DDoS攻撃防止のためレート制限の設定を推奨します' : undefined
        }
      ]

      setEnvChecks(mockChecks)
      
    } catch (error) {
      console.error('Failed to run environment checks:', error)
      toast.error('環境チェックに失敗しました')
    }
  }

  // 設定検証
  const validateConfig = async () => {
    try {
      const configToValidate = Object.fromEntries(
        Object.entries(config).map(([key, item]) => [key, item.value])
      )

      try {
        const response = await apiClient.validateSecureConfig(configToValidate)
        setValidation(response)
      } catch (error) {
        // モック検証結果
        const mockValidation: ValidationResult = {
          valid: Object.values(config).every(item => 
            !item.required || (item.value && item.value.trim() !== '')
          ),
          errors: {},
          warnings: {},
          missing: Object.values(config)
            .filter(item => item.required && (!item.value || item.value.trim() === ''))
            .map(item => item.key)
        }
        
        // バリデーションエラーをチェック
        Object.values(config).forEach(item => {
          if (item.validation?.pattern && item.value) {
            const regex = new RegExp(item.validation.pattern)
            if (!regex.test(item.value)) {
              mockValidation.errors[item.key] = 'フォーマットが正しくありません'
            }
          }
          
          if (item.validation?.minLength && item.value && item.value.length < item.validation.minLength) {
            mockValidation.errors[item.key] = `最低${item.validation.minLength}文字必要です`
          }
          
          if (item.validation?.maxLength && item.value && item.value.length > item.validation.maxLength) {
            mockValidation.errors[item.key] = `最大${item.validation.maxLength}文字まで`
          }
        })
        
        mockValidation.valid = Object.keys(mockValidation.errors).length === 0 && mockValidation.missing.length === 0
        setValidation(mockValidation)
      }
      
    } catch (error) {
      console.error('Failed to validate config:', error)
      toast.error('設定の検証に失敗しました')
    }
  }

  // 設定保存
  const saveConfig = async () => {
    try {
      setSaving(true)
      
      const configToSave = Object.fromEntries(
        Object.entries(config).map(([key, item]) => [key, item.value])
      )

      const response = await apiClient.updateSecureConfig(configToSave)
      
      if (response.success) {
        toast.success('設定を保存しました')
        await loadConfig()
        await runEnvironmentChecks()
      } else {
        toast.error('設定の保存に失敗しました')
      }
    } catch (error) {
      console.error('Failed to save config:', error)
      toast.error('設定の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // 設定エクスポート
  const exportConfig = async () => {
    try {
      const exportData = {
        exported_at: new Date().toISOString(),
        config: Object.fromEntries(
          Object.entries(config)
            .filter(([_, item]) => !item.sensitive)
            .map(([key, item]) => [key, { ...item, value: item.sensitive ? '[REDACTED]' : item.value }])
        ),
        validation: validation,
        environment_checks: envChecks
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `secure-config-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('設定をエクスポートしました')
    } catch (error) {
      console.error('Failed to export config:', error)
      toast.error('エクスポートに失敗しました')
    }
  }

  // 設定バックアップ
  const backupConfig = async () => {
    try {
      const response = await apiClient.backupSecureConfig()
      if (response.success) {
        toast.success('設定をバックアップしました')
      }
    } catch (error) {
      console.error('Failed to backup config:', error)
      toast.error('バックアップに失敗しました')
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    if (Object.keys(config).length > 0) {
      runEnvironmentChecks()
      validateConfig()
    }
  }, [config])

  // 設定値の更新
  const updateConfigValue = (key: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value,
        lastModified: new Date().toISOString(),
        modifiedBy: 'current_user'
      }
    }))
  }

  // センシティブ値の表示切り替え
  const toggleSensitiveVisibility = (key: string) => {
    setShowSensitive(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // ステータスアイコン
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      case 'error':
        return <X className="h-4 w-4 text-red-400" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="h-6 w-6" />
              セキュア設定管理
            </h3>
            <p className="text-gray-400 mt-1">アプリケーション設定と環境変数を安全に管理します</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-700 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6" />
            セキュア設定管理
          </h3>
          <p className="text-gray-400 mt-1">
            アプリケーション設定と環境変数を安全に管理します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={backupConfig}
            variant="outline"
            size="sm"
            className="border-gray-600"
          >
            <HardDrive className="h-4 w-4 mr-2" />
            バックアップ
          </Button>
          <Button
            onClick={exportConfig}
            variant="outline"
            size="sm"
            className="border-gray-600"
          >
            <Download className="h-4 w-4 mr-2" />
            エクスポート
          </Button>
          <Button
            onClick={validateConfig}
            variant="outline"
            size="sm"
            className="border-blue-600 text-blue-400"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            検証
          </Button>
          <Button
            onClick={saveConfig}
            disabled={saving || (validation && !validation.valid)}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? '保存中...' : '設定保存'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
          <TabsTrigger value="config" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            ⚙️ 設定管理
          </TabsTrigger>
          <TabsTrigger value="validation" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            ✅ 検証結果
          </TabsTrigger>
          <TabsTrigger value="environment" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            🔍 環境チェック
          </TabsTrigger>
        </TabsList>

        {/* 設定管理タブ */}
        <TabsContent value="config" className="space-y-4">
          {Object.entries(CONFIG_CATEGORIES).map(([categoryKey, categoryInfo]) => {
            const categoryItems = Object.values(config).filter(item => item.category === categoryKey)
            if (categoryItems.length === 0) return null

            const Icon = categoryInfo.icon
            
            return (
              <Card key={categoryKey} className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${categoryInfo.color}`} />
                    {categoryInfo.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categoryItems.map(item => (
                    <div key={item.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={item.key} className="text-white flex items-center gap-2">
                          {item.key}
                          {item.required && <Badge className="bg-red-500/20 border-red-500/50 text-red-400 text-xs">必須</Badge>}
                          {item.sensitive && <Lock className="h-3 w-3 text-yellow-400" />}
                        </Label>
                        {item.sensitive && (
                          <Button
                            onClick={() => toggleSensitiveVisibility(item.key)}
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto"
                          >
                            {showSensitive[item.key] ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        )}
                      </div>
                      
                      <Input
                        id={item.key}
                        type={item.sensitive && !showSensitive[item.key] ? 'password' : 'text'}
                        value={item.value}
                        onChange={(e) => updateConfigValue(item.key, e.target.value)}
                        placeholder={item.description}
                        className={`bg-gray-700 border-gray-600 ${
                          validation?.errors[item.key] ? 'border-red-500' : 
                          validation?.warnings[item.key] ? 'border-yellow-500' : ''
                        }`}
                      />
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">{item.description}</p>
                        {item.lastModified && (
                          <p className="text-xs text-gray-500">
                            最終更新: {new Date(item.lastModified).toLocaleString('ja-JP')}
                          </p>
                        )}
                      </div>
                      
                      {validation?.errors[item.key] && (
                        <Alert className="border-red-500/20 bg-red-500/10">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-red-300">
                            {validation.errors[item.key]}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {validation?.warnings[item.key] && (
                        <Alert className="border-yellow-500/20 bg-yellow-500/10">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-yellow-300">
                            {validation.warnings[item.key]}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* 検証結果タブ */}
        <TabsContent value="validation" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  設定検証結果
                </div>
                {validation && (
                  <Badge className={
                    validation.valid 
                      ? "bg-green-500/20 border-green-500/50 text-green-400"
                      : "bg-red-500/20 border-red-500/50 text-red-400"
                  }>
                    {validation.valid ? '有効' : '無効'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!validation ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">設定を検証してください</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {validation.missing.length > 0 && (
                    <Alert className="border-red-500/20 bg-red-500/10">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-red-300">
                        <strong>必須項目が未設定:</strong>
                        <ul className="mt-2 space-y-1">
                          {validation.missing.map(key => (
                            <li key={key}>• {key}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {Object.entries(validation.errors).length > 0 && (
                    <Alert className="border-red-500/20 bg-red-500/10">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-red-300">
                        <strong>エラー:</strong>
                        <ul className="mt-2 space-y-1">
                          {Object.entries(validation.errors).map(([key, error]) => (
                            <li key={key}>• {key}: {error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {Object.entries(validation.warnings).length > 0 && (
                    <Alert className="border-yellow-500/20 bg-yellow-500/10">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-yellow-300">
                        <strong>警告:</strong>
                        <ul className="mt-2 space-y-1">
                          {Object.entries(validation.warnings).map(([key, warning]) => (
                            <li key={key}>• {key}: {warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {validation.valid && (
                    <Alert className="border-green-500/20 bg-green-500/10">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription className="text-green-300">
                        すべての設定が有効です
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 環境チェックタブ */}
        <TabsContent value="environment" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                環境チェック結果
              </CardTitle>
            </CardHeader>
            <CardContent>
              {envChecks.length === 0 ? (
                <div className="text-center py-8">
                  <Terminal className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">環境チェックを実行中...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {envChecks.map((check, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(check.status)}
                          <div>
                            <h4 className="text-white font-medium">{check.name}</h4>
                            <p className="text-sm text-gray-400">{check.category}</p>
                          </div>
                        </div>
                        <Badge className={
                          check.status === 'success' 
                            ? "bg-green-500/20 border-green-500/50 text-green-400"
                            : check.status === 'warning'
                            ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                            : "bg-red-500/20 border-red-500/50 text-red-400"
                        }>
                          {check.status === 'success' ? '正常' : 
                           check.status === 'warning' ? '警告' : 'エラー'}
                        </Badge>
                      </div>
                      
                      <p className="text-white text-sm mb-2">{check.message}</p>
                      
                      {check.details && (
                        <p className="text-gray-400 text-xs mb-2">{check.details}</p>
                      )}
                      
                      {check.recommendation && (
                        <Alert className="border-orange-500/20 bg-orange-500/10 mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-orange-300 text-xs">
                            推奨: {check.recommendation}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}