import { redirect } from 'next/navigation'

export default function Home() {
  // サーバーサイドでリダイレクト（404エラーを回避）
  redirect('/market')
}