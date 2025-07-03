'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Newspaper } from 'lucide-react'

interface SafeImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  fallbackIcon?: React.ReactNode
}

/**
 * 外部画像を安全に表示するコンポーネント
 * 読み込みエラー時に自動的にフォールバックを表示
 */
export function SafeImage({
  src,
  alt,
  width,
  height,
  className = '',
  fallbackIcon = <Newspaper className="h-6 w-6 text-neutral-500" />
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  if (hasError) {
    return (
      <div className={`bg-neutral-100 border border-neutral-200 rounded-lg flex items-center justify-center ${className}`}>
        {fallbackIcon}
      </div>
    )
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className={`absolute inset-0 bg-neutral-100 border border-neutral-200 rounded-lg flex items-center justify-center ${className}`}>
          <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true)
          setIsLoading(false)
        }}
        unoptimized // 外部画像の場合は最適化を無効にする
      />
    </div>
  )
}