'use client'

// 動的レンダリングを強制（プリレンダリングエラー回避）
export const dynamic = 'force-dynamic'

import { TemplateManager } from '@/components/TemplateManager'

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      <div className="container mx-auto px-4 py-8">
        <TemplateManager />
      </div>
    </div>
  )
}