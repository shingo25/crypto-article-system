'use client'

// 動的レンダリングを強制（プリレンダリングエラー回避）
export const dynamic = 'force-dynamic'

import React from 'react'
import { NeuralLayout } from '@/components/neural/NeuralLayout'
import { NeuralDashboard } from '@/components/neural/NeuralDashboard'
import { useSystemStats } from '@/hooks/useSystemStats'

export default function NeuralDashboardPage() {
  const { stats } = useSystemStats()

  return (
    <NeuralLayout currentPath="/neural">
      <div className="neural-aurora" />
      <NeuralDashboard stats={stats} />
    </NeuralLayout>
  )
}