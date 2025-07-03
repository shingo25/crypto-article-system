import { redirect } from 'next/navigation'

// 動的レンダリングを強制（プリレンダリングエラー回避）
export const dynamic = 'force-dynamic'

export default function Home() {
  // サーバーサイドでリダイレクト（404エラーを回避）
  redirect('/market')
}