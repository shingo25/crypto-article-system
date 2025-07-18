import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  console.log('=== Environment Debug API Called ===')
  
  return NextResponse.json({
    encryptionKeyExists: !!process.env.ENCRYPTION_KEY,
    encryptionKeyLength: process.env.ENCRYPTION_KEY ? process.env.ENCRYPTION_KEY.length : 0,
    nodeEnv: process.env.NODE_ENV,
    jwtSecretExists: !!process.env.JWT_SECRET,
    databaseUrlExists: !!process.env.DATABASE_URL
  })
}