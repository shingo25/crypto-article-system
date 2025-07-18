'use client'

import Image from 'next/image'
import { useState } from 'react'

interface CryptoCoinImageProps {
  coinSymbol: string
  coinName?: string
  size?: number
  className?: string
}

export function CryptoCoinImage({ 
  coinSymbol, 
  coinName, 
  size = 24, 
  className = "" 
}: CryptoCoinImageProps) {
  const [imageError, setImageError] = useState(false)
  const [currentSource, setCurrentSource] = useState(0)
  
  // 複数のソースを試行する
  const imageSources = [
    `https://coin-images.coingecko.com/coins/images/1/large/${coinSymbol.toLowerCase()}.png`,
    `https://s2.coinmarketcap.com/static/img/coins/64x64/${coinSymbol.toLowerCase()}.png`,
    `https://cryptologos.cc/logos/${coinName?.toLowerCase().replace(/\s+/g, '-')}-${coinSymbol.toLowerCase()}-logo.png`,
    `https://assets.coingecko.com/coins/images/1/large/${coinSymbol.toLowerCase()}.png`
  ]
  
  const handleImageError = () => {
    if (currentSource < imageSources.length - 1) {
      setCurrentSource(prev => prev + 1)
    } else {
      setImageError(true)
    }
  }
  
  if (imageError) {
    // フォールバック: シンボルの最初の文字を表示
    return (
      <div 
        className={`inline-flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold rounded-full ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {coinSymbol.charAt(0)}
      </div>
    )
  }
  
  return (
    <Image
      src={imageSources[currentSource]}
      alt={`${coinName || coinSymbol} logo`}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      onError={handleImageError}
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyEkJNjn8rNPz99ixbmyWaTcPLczGAVIo4m2TrTJhIbWZJ5nL5JKA+nw7hMlPWOlv8AKHS0Mz5++u1tOsNNe9q2t1drnG4wKVxpJUQhY8sWlFZCaAZA4z7+vn6cK8TmWnc4pj0nZXzj2jKQgZRJX/IuVf8AaB4s6vPqBpj0qL5qkU+0LKpePSEgT5h2TaOTFcNPVjO3JMwxCfU9bT93cwzq4+v8FqpCcfA1V9sUZYdM2+4nJP8AJdMaL2v9Lz6t7RFY1QQhA="
      unoptimized={false}
    />
  )
}