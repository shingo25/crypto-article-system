import React from 'react'
import toast from 'react-hot-toast'

// 認証が必要な操作をチェックしてアラートを表示
export function requireAuth(isAuthenticated: boolean, actionName: string = '操作'): boolean {
  if (!isAuthenticated) {
    // メインのエラーメッセージ
    toast.error(`${actionName}を行うにはログインが必要です。`, {
      duration: 5000,
    })
    
    // ログインボタン付きの追加トースト
    setTimeout(() => {
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>ログインしますか？</span>
          <button
            className="px-3 py-1 bg-neural-cyan text-white rounded neural-transition hover:bg-neural-cyan/80"
            onClick={() => {
              toast.dismiss(t.id)
              window.location.href = '/login'
            }}
          >
            ログイン
          </button>
          <button
            className="px-3 py-1 bg-neural-surface text-neural-text-secondary rounded neural-transition hover:bg-neural-elevated"
            onClick={() => toast.dismiss(t.id)}
          >
            キャンセル
          </button>
        </div>
      ), {
        duration: 8000,
      })
    }, 1000)
    
    return false
  }
  return true
}

// 設定保存時の認証チェック
export function requireAuthForSave(isAuthenticated: boolean): boolean {
  return requireAuth(isAuthenticated, '設定の保存')
}

// RSSソース保存時の認証チェック
export function requireAuthForRSSSource(isAuthenticated: boolean): boolean {
  return requireAuth(isAuthenticated, 'RSSソースの保存')
}

// アラート保存時の認証チェック
export function requireAuthForAlert(isAuthenticated: boolean): boolean {
  return requireAuth(isAuthenticated, 'アラートの保存')
}

// 記事保存時の認証チェック
export function requireAuthForArticle(isAuthenticated: boolean): boolean {
  return requireAuth(isAuthenticated, '記事の保存')
}

// テンプレート保存時の認証チェック
export function requireAuthForTemplate(isAuthenticated: boolean): boolean {
  return requireAuth(isAuthenticated, 'テンプレートの保存')
}