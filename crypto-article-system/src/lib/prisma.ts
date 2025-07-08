import { PrismaClient } from '@/generated/prisma'
import { encrypt, decrypt } from './encryption'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

// 暗号化対象のモデルとフィールドを定義
const ENCRYPTED_FIELDS = {
  AIProviderSettings: ['apiKey']
}

// 暗号化ミドルウェアの設定
prisma.$use(async (params, next) => {
  // 暗号化が必要なモデルかチェック
  if (params.model && ENCRYPTED_FIELDS[params.model as keyof typeof ENCRYPTED_FIELDS]) {
    const encryptedFields = ENCRYPTED_FIELDS[params.model as keyof typeof ENCRYPTED_FIELDS]
    
    // 書き込み時（create, update, upsert）の暗号化
    if (params.action === 'create' || params.action === 'update' || params.action === 'upsert') {
      const data = params.action === 'upsert' ? params.args.create || params.args.update : params.args.data
      
      if (data) {
        // 暗号化対象フィールドを暗号化
        for (const field of encryptedFields) {
          if (data[field] && typeof data[field] === 'string') {
            try {
              data[field] = encrypt(data[field])
            } catch (error) {
              console.error(`Failed to encrypt field ${field}:`, error)
              throw new Error(`Encryption failed for field ${field}`)
            }
          }
        }
      }
    }
  }
  
  // クエリを実行
  const result = await next(params)
  
  // 読み取り時（find系）の復号化
  if (params.model && ENCRYPTED_FIELDS[params.model as keyof typeof ENCRYPTED_FIELDS]) {
    const encryptedFields = ENCRYPTED_FIELDS[params.model as keyof typeof ENCRYPTED_FIELDS]
    
    if (params.action === 'findFirst' || params.action === 'findUnique' || params.action === 'findUniqueOrThrow') {
      if (result) {
        decryptResult(result, encryptedFields)
      }
    } else if (params.action === 'findMany') {
      if (Array.isArray(result)) {
        result.forEach(item => decryptResult(item, encryptedFields))
      }
    }
  }
  
  return result
})

// 復号化ヘルパー関数
function decryptResult(result: any, encryptedFields: string[]) {
  for (const field of encryptedFields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = decrypt(result[field])
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error)
        // 復号化に失敗した場合は、フィールドを空文字に設定
        result[field] = ''
      }
    }
  }
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma