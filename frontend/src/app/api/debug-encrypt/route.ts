import { NextRequest, NextResponse } from 'next/server'
import { encrypt, decrypt } from '@/lib/encryption'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  console.log('=== Debug Encrypt API Called ===')
  
  try {
    const body = await request.json()
    const { text } = body
    
    console.log('Text to encrypt:', text ? text.substring(0, 10) + '...' : 'undefined')
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }
    
    // 暗号化テスト
    console.log('Starting encryption test...')
    const encrypted = encrypt(text)
    
    // 復号テスト
    console.log('Starting decryption test...')
    const decrypted = decrypt(encrypted)
    
    const success = text === decrypted
    
    return NextResponse.json({
      success,
      originalLength: text.length,
      encryptedLength: encrypted.length,
      decryptedLength: decrypted.length,
      encryptedPreview: encrypted.substring(0, 50) + '...',
      decryptionMatch: success
    })
    
  } catch (error) {
    console.error('Debug encrypt failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}