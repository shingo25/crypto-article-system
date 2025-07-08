#!/usr/bin/env node

/**
 * セキュリティテストスクリプト
 * 重要なセキュリティ項目をチェックします
 */

import fs from 'fs'
import path from 'path'

interface SecurityTestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  message: string
  details?: string
}

const results: SecurityTestResult[] = []

function addResult(name: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: string) {
  results.push({ name, status, message, details })
}

// 1. 環境変数の確認
function testEnvironmentVariables() {
  console.log('🔐 環境変数のセキュリティチェック...')
  
  const requiredEnvVars = [
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'DATABASE_URL'
  ]
  
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar]
    if (!value) {
      addResult(
        `環境変数: ${envVar}`,
        'FAIL',
        '必要な環境変数が設定されていません'
      )
    } else if (value.length < 32) {
      addResult(
        `環境変数: ${envVar}`,
        'WARNING', 
        '環境変数の値が短すぎる可能性があります（推奨: 32文字以上）'
      )
    } else {
      addResult(
        `環境変数: ${envVar}`,
        'PASS',
        '適切に設定されています'
      )
    }
  })
}

// 2. ファイル内のハードコードされたシークレットの確認
function testHardcodedSecrets() {
  console.log('🔍 ハードコードされたシークレットの確認...')
  
  const suspiciousPatterns = [
    { pattern: /sk-[a-zA-Z0-9]{20,}/, name: 'OpenAI API Key' },
    { pattern: /xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]{24}/, name: 'Slack Bot Token' },
    { pattern: /ghp_[a-zA-Z0-9]{36}/, name: 'GitHub Personal Access Token' },
    { pattern: /pk_live_[a-zA-Z0-9]{24,}/, name: 'Stripe Live Key' },
    { pattern: /sk_live_[a-zA-Z0-9]{24,}/, name: 'Stripe Secret Key' },
    { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key' },
    { pattern: /password\s*[:=]\s*["'][^"']{8,}["']/, name: 'Hardcoded Password' }
  ]
  
  const filesToCheck = [
    './src',
    './components',
    './lib',
    './pages',
    './app'
  ]
  
  function scanDirectory(dirPath: string) {
    if (!fs.existsSync(dirPath)) return
    
    const items = fs.readdirSync(dirPath)
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDirectory(fullPath)
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx'))) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        
        suspiciousPatterns.forEach(({ pattern, name }) => {
          const matches = content.match(pattern)
          if (matches) {
            addResult(
              `ハードコードされたシークレット: ${name}`,
              'FAIL',
              `ファイル ${fullPath} で疑わしいパターンが検出されました`,
              `検出されたパターン: ${matches[0].substring(0, 20)}...`
            )
          }
        })
      }
    })
  }
  
  filesToCheck.forEach(dir => scanDirectory(dir))
  
  if (results.filter(r => r.name.includes('ハードコードされたシークレット')).length === 0) {
    addResult(
      'ハードコードされたシークレット',
      'PASS',
      'ハードコードされたシークレットは検出されませんでした'
    )
  }
}

// 3. 暗号化設定の確認
function testEncryptionConfig() {
  console.log('🔒 暗号化設定の確認...')
  
  // Prismaミドルウェアの暗号化設定を確認
  const prismaPath = './src/lib/prisma.ts'
  if (fs.existsSync(prismaPath)) {
    const content = fs.readFileSync(prismaPath, 'utf-8')
    
    if (content.includes('encrypt') && content.includes('decrypt')) {
      addResult(
        '暗号化ミドルウェア',
        'PASS',
        'Prismaミドルウェアで暗号化が実装されています'
      )
    } else {
      addResult(
        '暗号化ミドルウェア',
        'FAIL',
        'Prismaミドルウェアで暗号化が実装されていません'
      )
    }
  }
  
  // 暗号化ライブラリの確認
  const encryptionPath = './src/lib/encryption.ts'
  if (fs.existsSync(encryptionPath)) {
    const content = fs.readFileSync(encryptionPath, 'utf-8')
    
    if (content.includes('aes-256-gcm')) {
      addResult(
        '暗号化アルゴリズム',
        'PASS',
        'AES-256-GCMが使用されています'
      )
    } else {
      addResult(
        '暗号化アルゴリズム',
        'WARNING',
        '推奨される暗号化アルゴリズム（AES-256-GCM）が使用されていない可能性があります'
      )
    }
  }
}

// 4. CSPヘッダーの確認
function testCSPHeaders() {
  console.log('🛡️ CSPヘッダーの確認...')
  
  const middlewarePath = './src/middleware.ts'
  if (fs.existsSync(middlewarePath)) {
    const content = fs.readFileSync(middlewarePath, 'utf-8')
    
    if (content.includes('Content-Security-Policy') && !content.includes('// response.headers.set(\'Content-Security-Policy\'')) {
      addResult(
        'CSPヘッダー',
        'PASS',
        'Content-Security-Policyヘッダーが設定されています'
      )
    } else {
      addResult(
        'CSPヘッダー',
        'FAIL',
        'Content-Security-Policyヘッダーが設定されていません'
      )
    }
    
    // その他のセキュリティヘッダーの確認
    const securityHeaders = [
      'X-Frame-Options',
      'X-Content-Type-Options', 
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Referrer-Policy'
    ]
    
    securityHeaders.forEach(header => {
      if (content.includes(header)) {
        addResult(
          `セキュリティヘッダー: ${header}`,
          'PASS',
          '設定されています'
        )
      } else {
        addResult(
          `セキュリティヘッダー: ${header}`,
          'WARNING',
          '設定されていません'
        )
      }
    })
  }
}

// 5. API認証の確認
function testAPIAuthentication() {
  console.log('🔑 API認証の確認...')
  
  const apiPaths = [
    './src/app/api/users/ai-settings/route.ts',
    './src/app/api/ai/chat/route.ts'
  ]
  
  apiPaths.forEach(apiPath => {
    if (fs.existsSync(apiPath)) {
      const content = fs.readFileSync(apiPath, 'utf-8')
      
      if (content.includes('requireAuth')) {
        addResult(
          `API認証: ${path.basename(apiPath)}`,
          'PASS',
          '認証チェックが実装されています'
        )
      } else {
        addResult(
          `API認証: ${path.basename(apiPath)}`,
          'FAIL',
          '認証チェックが実装されていません'
        )
      }
    }
  })
}

// 6. 入力検証の確認
function testInputValidation() {
  console.log('✅ 入力検証の確認...')
  
  const validationPath = './src/lib/validation.ts'
  if (fs.existsSync(validationPath)) {
    const content = fs.readFileSync(validationPath, 'utf-8')
    
    if (content.includes('zod') || content.includes('z.')) {
      addResult(
        '入力検証ライブラリ',
        'PASS',
        'Zodライブラリを使用した入力検証が実装されています'
      )
    } else {
      addResult(
        '入力検証ライブラリ',
        'WARNING',
        '入力検証ライブラリが確認できません'
      )
    }
    
    if (content.includes('sanitize') || content.includes('XSS') || content.includes('SQL')) {
      addResult(
        'XSS/SQLインジェクション対策',
        'PASS',
        'XSSやSQLインジェクション対策が実装されています'
      )
    } else {
      addResult(
        'XSS/SQLインジェクション対策',
        'WARNING',
        'XSSやSQLインジェクション対策の明示的な実装が確認できません'
      )
    }
  }
}

// メイン実行関数
async function runSecurityTests() {
  console.log('🚀 セキュリティテストを開始します...\n')
  
  testEnvironmentVariables()
  testHardcodedSecrets()
  testEncryptionConfig()
  testCSPHeaders()
  testAPIAuthentication()
  testInputValidation()
  
  console.log('\n📊 セキュリティテスト結果:')
  console.log('=' .repeat(80))
  
  let passCount = 0
  let failCount = 0
  let warningCount = 0
  
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️'
    console.log(`${icon} [${result.status}] ${result.name}: ${result.message}`)
    
    if (result.details) {
      console.log(`   詳細: ${result.details}`)
    }
    
    if (result.status === 'PASS') passCount++
    else if (result.status === 'FAIL') failCount++
    else warningCount++
  })
  
  console.log('=' .repeat(80))
  console.log(`📈 総計: ${results.length}項目中 ✅ ${passCount}件合格, ❌ ${failCount}件不合格, ⚠️ ${warningCount}件警告`)
  
  if (failCount > 0) {
    console.log('\n🚨 重要: 不合格項目を修正してください')
    process.exit(1)
  } else if (warningCount > 0) {
    console.log('\n⚠️ 注意: 警告項目の確認をお勧めします')
  } else {
    console.log('\n🎉 全てのセキュリティテストに合格しました！')
  }
}

// スクリプト実行
if (require.main === module) {
  runSecurityTests().catch(console.error)
}