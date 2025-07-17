import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('PostgreSQL接続テスト中...')
    const count = await prisma.user.count()
    console.log(`ユーザー数: ${count}`)
    console.log('✅ PostgreSQL接続成功！')
  } catch (error) {
    console.error('❌ PostgreSQL接続エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()