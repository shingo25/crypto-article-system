'use client'

import React from 'react'
import { diffLines } from 'diff'
import { Card } from '@/components/ui/card'

interface DiffViewerProps {
  oldText: string
  newText: string
  oldTitle?: string
  newTitle?: string
}

export function DiffViewer({ oldText, newText, oldTitle = '変更前', newTitle = '変更後' }: DiffViewerProps) {
  const changes = diffLines(oldText || '', newText || '')
  
  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-4">
        {/* 変更前 */}
        <div>
          <h3 className="font-medium text-sm mb-2 text-red-600 dark:text-red-400">{oldTitle}</h3>
          <div className="border rounded-lg max-h-96 overflow-auto">
            <div className="p-3 bg-red-50 dark:bg-red-950 text-sm font-mono whitespace-pre-wrap">
              {changes.map((change, index) => {
                if (change.removed) {
                  return (
                    <div key={index} className="bg-red-200 dark:bg-red-900 px-1 rounded">
                      {change.value}
                    </div>
                  )
                } else if (!change.added) {
                  return (
                    <div key={index} className="opacity-50">
                      {change.value}
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>
        </div>

        {/* 変更後 */}
        <div>
          <h3 className="font-medium text-sm mb-2 text-green-600 dark:text-green-400">{newTitle}</h3>
          <div className="border rounded-lg max-h-96 overflow-auto">
            <div className="p-3 bg-green-50 dark:bg-green-950 text-sm font-mono whitespace-pre-wrap">
              {changes.map((change, index) => {
                if (change.added) {
                  return (
                    <div key={index} className="bg-green-200 dark:bg-green-900 px-1 rounded">
                      {change.value}
                    </div>
                  )
                } else if (!change.removed) {
                  return (
                    <div key={index} className="opacity-50">
                      {change.value}
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>削除: {changes.filter(c => c.removed).length}行</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>追加: {changes.filter(c => c.added).length}行</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span>変更なし: {changes.filter(c => !c.added && !c.removed).length}行</span>
          </div>
        </div>
      </div>
    </Card>
  )
}