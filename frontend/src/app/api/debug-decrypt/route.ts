import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

export const runtime = 'nodejs'

export async function GET() {
  console.log('=== Debug Decrypt API Called ===')
  
  try {
    // 環境変数チェック
    console.log('ENCRYPTION_KEY exists:', !!process.env.ENCRYPTION_KEY)
    console.log('ENCRYPTION_KEY length:', process.env.ENCRYPTION_KEY?.length)
    
    // DBからGEMINI設定を取得
    const setting = await prisma.aIProviderSettings.findFirst({
      where: {
        provider: 'GEMINI',
        user: {
          email: 'admin@test.com'
        }
      }
    })
    
    if (!setting) {
      return NextResponse.json({ error: 'GEMINI設定が見つかりません' }, { status: 404 })
    }
    
    console.log('Setting found, encrypted key length:', setting.apiKey.length)
    
    // 復号化テスト
    const decryptedKey = decrypt(setting.apiKey)
    console.log('Decryption successful, key length:', decryptedKey.length)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Decryption successful',
      keyLength: decryptedKey.length,
      keyPreview: decryptedKey.substring(0, 20) + '...'
    })
    
  } catch (error) {
    console.error('Debug decrypt failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}