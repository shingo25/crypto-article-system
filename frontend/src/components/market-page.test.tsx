import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'
import '@testing-library/jest-dom'
import MarketPage from '../page'

// モック設定
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

jest.mock('react-hot-toast', () => ({
  toast: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
}))

// APIモック
global.fetch = jest.fn()

describe('Market Page - Latest News "もっと見る" 機能', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // デフォルトのAPIレスポンス
    const mockNewsData = Array.from({ length: 15 }, (_, i) => ({
      id: `news-${i + 1}`,
      title: `ニュース${i + 1}`,
      summary: `ニュース${i + 1}の要約`,
      url: `https://example.com/news/${i + 1}`,
      publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
      source: 'test-source',
      importance: 5,
      coins: ['BTC'],
      tags: ['cryptocurrency'],
      technology: ['blockchain', 'defi'], // technologyプロパティを追加
      entities: ['Bitcoin', 'Ethereum'] // entitiesプロパティを追加
    }))

    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/sources')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            sources: [{ id: '1', name: 'Test Source', url: 'https://example.com' }]
          })
        })
      }
      if (url.includes('/api/news')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              items: mockNewsData,
              total: mockNewsData.length
            }
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('初期表示テスト', () => {
    test('1-1: ニュースが初期表示件数（5件）より多い場合、5件のニュースと「もっと見る」ボタンが表示される', async () => {
      render(<MarketPage />)

      // ニュースが読み込まれるまで待機
      await waitFor(() => {
        expect(screen.getByText('ニュース1')).toBeInTheDocument()
      })

      // 初期表示で5件のニュースが表示されることを確認
      const newsItems = screen.getAllByText(/ニュース\d+/)
      expect(newsItems).toHaveLength(5)

      // 「もっと見る」ボタンが表示されることを確認
      const loadMoreButton = screen.getByRole('button', { name: /もっと見る/ })
      expect(loadMoreButton).toBeInTheDocument()
      expect(loadMoreButton).toHaveTextContent('もっと見る（残り 10 件）')
    })

    test('1-2: ニュースが初期表示件数（5件）以下の場合、全件表示され「もっと見る」ボタンが表示されない', async () => {
      // 3件のニュースデータでモック
      const mockNewsData = Array.from({ length: 3 }, (_, i) => ({
        id: `news-${i + 1}`,
        title: `ニュース${i + 1}`,
        summary: `ニュース${i + 1}の要約`,
        url: `https://example.com/news/${i + 1}`,
        publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
        source: 'test-source',
        importance: 5,
        coins: ['BTC'],
        tags: ['cryptocurrency'],
        technology: ['blockchain', 'defi'],
        entities: ['Bitcoin', 'Ethereum']
      }))

      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/sources')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              sources: [{ id: '1', name: 'Test Source', url: 'https://example.com' }]
            })
          })
        }
        if (url.includes('/api/news')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: {
                items: mockNewsData,
                total: mockNewsData.length
              }
            })
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        })
      })

      render(<MarketPage />)

      // ニュースが読み込まれるまで待機
      await waitFor(() => {
        expect(screen.getByText('ニュース1')).toBeInTheDocument()
      })

      // 3件のニュースが表示されることを確認
      const newsItems = screen.getAllByText(/ニュース\d+/)
      expect(newsItems).toHaveLength(3)

      // 「もっと見る」ボタンが表示されないことを確認
      const loadMoreButton = screen.queryByRole('button', { name: /もっと見る/ })
      expect(loadMoreButton).toBeNull()
    })
  })

  describe('「もっと見る」ボタン機能テスト', () => {
    test('2-1: ボタンを1回クリックすると表示件数が10件に増える', async () => {
      render(<MarketPage />)

      // 初期表示を待機
      await waitFor(() => {
        expect(screen.getByText('ニュース1')).toBeInTheDocument()
      })

      // 初期状態で5件表示されることを確認
      let newsItems = screen.getAllByText(/ニュース\d+/)
      expect(newsItems).toHaveLength(5)

      // 「もっと見る」ボタンをクリック
      const loadMoreButton = screen.getByRole('button', { name: /もっと見る/ })
      fireEvent.click(loadMoreButton)

      // 10件表示されることを確認
      await waitFor(() => {
        newsItems = screen.getAllByText(/ニュース\d+/)
        expect(newsItems).toHaveLength(10)
      })

      // 「もっと見る」ボタンがまだ表示されていることを確認
      const updatedLoadMoreButton = screen.getByRole('button', { name: /もっと見る/ })
      expect(updatedLoadMoreButton).toBeInTheDocument()
      expect(updatedLoadMoreButton).toHaveTextContent('もっと見る（残り 5 件）')
    })

    test('2-2: 全件表示されるまでクリックするとボタンが非表示になる', async () => {
      render(<MarketPage />)

      // 初期表示を待機
      await waitFor(() => {
        expect(screen.getByText('ニュース1')).toBeInTheDocument()
      })

      // 1回目のクリック
      let loadMoreButton = screen.getByRole('button', { name: /もっと見る/ })
      fireEvent.click(loadMoreButton)

      // 10件表示されることを確認
      await waitFor(() => {
        const newsItems = screen.getAllByText(/ニュース\d+/)
        expect(newsItems).toHaveLength(10)
      })

      // 2回目のクリック
      loadMoreButton = screen.getByRole('button', { name: /もっと見る/ })
      fireEvent.click(loadMoreButton)

      // 全15件表示されることを確認
      await waitFor(() => {
        const newsItems = screen.getAllByText(/ニュース\d+/)
        expect(newsItems).toHaveLength(15)
      })

      // 「もっと見る」ボタンが非表示になることを確認
      const finalLoadMoreButton = screen.queryByRole('button', { name: /もっと見る/ })
      expect(finalLoadMoreButton).toBeNull()
    })

    test('2-3: 総件数が表示単位の倍数の場合、適切に全件表示される', async () => {
      // 10件のニュースデータでモック
      const mockNewsData = Array.from({ length: 10 }, (_, i) => ({
        id: `news-${i + 1}`,
        title: `ニュース${i + 1}`,
        summary: `ニュース${i + 1}の要約`,
        url: `https://example.com/news/${i + 1}`,
        publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
        source: 'test-source',
        importance: 5,
        coins: ['BTC'],
        tags: ['cryptocurrency'],
        technology: ['blockchain', 'defi'],
        entities: ['Bitcoin', 'Ethereum']
      }))

      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/sources')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              sources: [{ id: '1', name: 'Test Source', url: 'https://example.com' }]
            })
          })
        }
        if (url.includes('/api/news')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: {
                items: mockNewsData,
                total: mockNewsData.length
              }
            })
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        })
      })

      render(<MarketPage />)

      // 初期表示を待機
      await waitFor(() => {
        expect(screen.getByText('ニュース1')).toBeInTheDocument()
      })

      // 「もっと見る」ボタンをクリック
      const loadMoreButton = screen.getByRole('button', { name: /もっと見る/ })
      fireEvent.click(loadMoreButton)

      // 全10件表示されることを確認
      await waitFor(() => {
        const newsItems = screen.getAllByText(/ニュース\d+/)
        expect(newsItems).toHaveLength(10)
      })

      // 「もっと見る」ボタンが非表示になることを確認
      const finalLoadMoreButton = screen.queryByRole('button', { name: /もっと見る/ })
      expect(finalLoadMoreButton).toBeNull()
    })
  })

  describe('状態リセットテスト', () => {
    test('3-1: 「今すぐ更新」ボタンクリック後、表示件数が5件にリセットされる', async () => {
      render(<MarketPage />)

      // 初期表示を待機
      await waitFor(() => {
        expect(screen.getByText('ニュース1')).toBeInTheDocument()
      })

      // 「もっと見る」ボタンをクリックして10件表示
      const loadMoreButton = screen.getByRole('button', { name: /もっと見る/ })
      fireEvent.click(loadMoreButton)

      await waitFor(() => {
        const newsItems = screen.getAllByText(/ニュース\d+/)
        expect(newsItems).toHaveLength(10)
      })

      // 「今すぐ更新」ボタンをクリック
      const refreshButton = screen.getByRole('button', { name: /今すぐ更新/ })
      fireEvent.click(refreshButton)

      // 表示件数が5件にリセットされることを確認
      await waitFor(() => {
        const newsItems = screen.getAllByText(/ニュース\d+/)
        expect(newsItems).toHaveLength(5)
      })

      // 「もっと見る」ボタンが再び表示されることを確認
      const resetLoadMoreButton = screen.getByRole('button', { name: /もっと見る/ })
      expect(resetLoadMoreButton).toBeInTheDocument()
    })
  })
})