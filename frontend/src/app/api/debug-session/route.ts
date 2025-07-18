import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest) {
  console.log('=== Debug Session API Called ===')
  
  try {
    // 認証情報確認
    const user = await verifyAuth(_request)
    
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        message: 'No authentication found'
      })
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username,
        role: user.role
      }
    })
    
  } catch (error) {
    console.error('Debug session failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      authenticated: false
    }, { status: 500 })
  }
}