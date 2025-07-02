import { useMemo } from 'react'

interface SanitizationOptions {
  maxLength?: number
  allowedCharacters?: RegExp
  removeHtml?: boolean
  trimWhitespace?: boolean
}

export const useInputSanitizer = () => {
  const sanitizeInput = useMemo(() => {
    return (input: string, options: SanitizationOptions = {}) => {
      const {
        maxLength = 1000,
        allowedCharacters,
        removeHtml = true,
        trimWhitespace = true
      } = options

      let sanitized = input

      // 空文字チェック
      if (!sanitized || typeof sanitized !== 'string') {
        return ''
      }

      // HTMLタグを除去
      if (removeHtml) {
        sanitized = sanitized.replace(/<[^>]*>/g, '')
      }

      // スクリプトタグとイベントハンドラを除去（追加セキュリティ）
      sanitized = sanitized.replace(/(<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>)/gi, '')
      sanitized = sanitized.replace(/on\w+\s*=\s*['"]/gi, '')

      // 特殊文字をエスケープ（一部のHTML実体文字）
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

      // 許可された文字のみを残す
      if (allowedCharacters) {
        const matches = sanitized.match(allowedCharacters)
        sanitized = matches ? matches.join('') : ''
      }

      // 前後の空白を除去
      if (trimWhitespace) {
        sanitized = sanitized.trim()
      }

      // 最大長を制限
      if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength)
      }

      return sanitized
    }
  }, [])

  const validateCryptoSymbol = useMemo(() => {
    return (symbol: string): boolean => {
      const sanitized = sanitizeInput(symbol, {
        allowedCharacters: /[A-Z0-9]/g,
        maxLength: 10
      })
      return sanitized.length >= 1 && sanitized.length <= 10 && /^[A-Z0-9]+$/.test(sanitized)
    }
  }, [sanitizeInput])

  const validateNumericValue = useMemo(() => {
    return (value: string, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number | null => {
      const sanitized = sanitizeInput(value, {
        allowedCharacters: /[0-9.]/g,
        maxLength: 20
      })
      
      const parsed = parseFloat(sanitized)
      
      if (isNaN(parsed) || parsed < min || parsed > max) {
        return null
      }
      
      return parsed
    }
  }, [sanitizeInput])

  const validateText = useMemo(() => {
    return (text: string, maxLength: number = 200): string | null => {
      const sanitized = sanitizeInput(text, {
        maxLength,
        removeHtml: true,
        trimWhitespace: true
      })
      
      // 危険なパターンをチェック
      const dangerousPatterns = [
        /javascript:/gi,
        /data:text\/html/gi,
        /vbscript:/gi,
        /onload=/gi,
        /onerror=/gi
      ]
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitized)) {
          return null
        }
      }
      
      return sanitized
    }
  }, [sanitizeInput])

  return {
    sanitizeInput,
    validateCryptoSymbol,
    validateNumericValue,
    validateText
  }
}