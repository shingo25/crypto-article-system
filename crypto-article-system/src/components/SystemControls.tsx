'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { useSystemStats } from '@/hooks/useSystemStats'
import { PlayCircle, StopCircle, RotateCcw, Download } from 'lucide-react'

export function SystemControls() {
  const { 
    stats, 
    startSystem, 
    stopSystem, 
    restartSystem, 
    collectTopics,
    isControlling,
    isCollecting
  } = useSystemStats()

  const isRunning = stats.systemStatus === 'running'

  return (
    <div className="flex gap-3">
      <Button
        onClick={collectTopics}
        disabled={isCollecting}
        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        {isCollecting ? 'トピック収集中...' : 'トピック収集'}
      </Button>
      
      <Button
        onClick={restartSystem}
        disabled={isControlling}
        variant="outline"
        className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white flex items-center gap-2"
      >
        <RotateCcw className="h-4 w-4" />
        再起動
      </Button>
      
      <Button
        onClick={isRunning ? stopSystem : startSystem}
        disabled={isControlling}
        className={`flex items-center gap-2 ${
          isRunning 
            ? 'bg-red-600 hover:bg-red-700' 
            : 'bg-green-600 hover:bg-green-700'
        } text-white`}
      >
        {isRunning ? (
          <>
            <StopCircle className="h-4 w-4" />
            {isControlling ? '停止中...' : 'システム停止'}
          </>
        ) : (
          <>
            <PlayCircle className="h-4 w-4" />
            {isControlling ? '開始中...' : 'システム開始'}
          </>
        )}
      </Button>
    </div>
  )
}