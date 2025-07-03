'use client'

// 動的レンダリングを強制（プリレンダリングエラー回避）
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Newspaper, 
  Search, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Sparkles,
  ExternalLink,
  BarChart3,
  Zap,
  Globe,
  Tag
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { SafeImage } from '@/components/SafeImage'

interface NewsItem {
  id: string
  title: string
  summary: string
  content?: string
  url: string
  imageUrl?: string
  source: string
  author?: string
  sentiment: number // -1 to 1
  importance: number // 1-10
  aiSummary?: string
  // 構造化タグシステム
  topics: string[]      // 一般的なトピック
  coins: string[]       // 通貨・トークン
  companies: string[]   // 企業・取引所
  products: string[]    // 金融商品
  technology: string[]  // 技術関連
  market: string[]      // 市場動向
  regulatory: string[]  // 規制・法的
  regions: string[]     // 地域
  hasGeneratedArticle: boolean
  publishedAt: string
  createdAt: string
}

const mockNewsItems: NewsItem[] = [
  {
    id: '1',
    title: 'ビットコインETFへの資金流入が記録的水準に到達',
    summary: '機関投資家からの継続的な資金流入により、ビットコインETFが新たな記録を樹立。市場への影響と今後の見通しを専門家が分析。',
    content: 'ビットコインETFへの資金流入が過去最高を記録し、機関投資家の仮想通貨への関心の高まりを示している...',
    url: 'https://example.com/news/btc-etf-inflow-record',
    imageUrl: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png',
    source: 'CryptoNews',
    author: 'Market Analyst',
    sentiment: 0.8,
    importance: 9,
    aiSummary: 'ビットコインETFが記録的な資金流入を記録。機関投資家の参入が加速し、価格上昇の要因となっている。',
    topics: ['ETF', 'Institutional Investment', 'Bitcoin'],
    coins: ['BTC'],
    hasGeneratedArticle: false,
    publishedAt: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-15T10:35:00Z'
  },
  {
    id: '2',
    title: 'イーサリアム2.0のステーキング報酬率が上昇',
    summary: 'ネットワークの利用増加により、イーサリアム2.0のステーキング報酬率が予想を上回る水準まで上昇。バリデータへの影響を解説。',
    url: 'https://example.com/news/eth-staking-rewards',
    imageUrl: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png',
    source: 'ETH News',
    author: 'Technical Writer',
    sentiment: 0.6,
    importance: 7,
    aiSummary: 'イーサリアムのステーキング報酬率が上昇。ネットワーク活動の増加が主な要因。',
    topics: ['Staking', 'Ethereum 2.0', 'Rewards'],
    coins: ['ETH'],
    hasGeneratedArticle: true,
    publishedAt: '2024-01-15T08:15:00Z',
    createdAt: '2024-01-15T08:20:00Z'
  },
  {
    id: '3',
    title: 'DeFiプロトコルで新たなセキュリティ脆弱性を発見',
    summary: 'セキュリティ研究者が人気DeFiプロトコルで重大な脆弱性を発見。開発チームは緊急パッチを準備中。',
    url: 'https://example.com/news/defi-security-vulnerability',
    source: 'Security Alert',
    sentiment: -0.7,
    importance: 8,
    aiSummary: 'DeFiプロトコルでセキュリティ脆弱性が発見。緊急対応が必要な状況。',
    topics: ['Security', 'DeFi', 'Vulnerability'],
    coins: ['ETH', 'UNI'],
    hasGeneratedArticle: false,
    publishedAt: '2024-01-15T14:20:00Z',
    createdAt: '2024-01-15T14:25:00Z'
  },
  {
    id: '4',
    title: 'Solana生態系での新プロジェクト発表により価格上昇',
    summary: 'Solana上で革新的なNFTプロジェクトが発表され、SOLトークンの価格が急上昇。エコシステムの成長に注目。',
    url: 'https://example.com/news/solana-new-project',
    imageUrl: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png',
    source: 'Solana News',
    sentiment: 0.5,
    importance: 6,
    aiSummary: 'Solana上での新プロジェクト発表がSOL価格の上昇要因となっている。',
    topics: ['NFT', 'Solana', 'Project Launch'],
    coins: ['SOL'],
    hasGeneratedArticle: false,
    publishedAt: '2024-01-15T12:45:00Z',
    createdAt: '2024-01-15T12:50:00Z'
  },
  {
    id: '5',
    title: '中央銀行デジタル通貨（CBDC）の試験運用が拡大',
    summary: '複数の国がCBDCの試験運用を拡大。デジタル通貨の普及が仮想通貨市場に与える影響について専門家が議論。',
    url: 'https://example.com/news/cbdc-expansion',
    source: 'Central Bank News',
    sentiment: 0.3,
    importance: 7,
    aiSummary: 'CBDC試験運用の拡大が仮想通貨市場に複雑な影響を与える可能性。',
    topics: ['CBDC', 'Central Bank', 'Digital Currency'],
    coins: ['BTC', 'ETH'],
    hasGeneratedArticle: false,
    publishedAt: '2024-01-15T09:30:00Z',
    createdAt: '2024-01-15T09:35:00Z'
  }
]

export default function NewsFeedPage() {
  const router = useRouter()
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState('all')
  const [selectedImportance, setSelectedImportance] = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [sources, setSources] = useState<string[]>(['all'])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null)

  // スケジューラー状態を取得
  const checkSchedulerStatus = async () => {
    try {
      const response = await fetch('/api/rss-scheduler')
      const data = await response.json()
      if (data.success) {
        setSchedulerStatus(data.data)
      }
    } catch (error) {
      console.error('Failed to check scheduler status:', error)
    }
  }

  // スケジューラーを開始
  const startScheduler = async () => {
    try {
      const response = await fetch('/api/rss-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      })
      const data = await response.json()
      if (data.success) {
        setSchedulerStatus(data.data)
        toast.success('RSSスケジューラーを開始しました')
      }
    } catch (error) {
      console.error('Failed to start scheduler:', error)
      toast.error('スケジューラーの開始に失敗しました')
    }
  }

  const loadNewsData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        search: searchQuery,
        source: selectedSource,
        importance: selectedImportance
      })

      const response = await fetch(`/api/news?${params}`)
      const data = await response.json()

      if (data.success) {
        setNewsItems(data.data.items)
        setTotalPages(data.data.pagination.totalPages)
        setSources(['all', ...data.data.sources])
        
        if (data.data.items.length === 0 && page === 1) {
          // 初回でデータがない場合は収集を開始
          await fetch('/api/news', { method: 'POST' })
          toast('ニュース収集を開始しました。しばらくお待ちください。', {
            icon: '📰',
            duration: 5000
          })
        }
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Failed to load news:', error)
      toast.error('ニュースの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 初回ロード
  useEffect(() => {
    loadNewsData()
    checkSchedulerStatus()
  }, [page, searchQuery, selectedSource, selectedImportance])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadNewsData()
      checkSchedulerStatus()
    }, 300000) // 5分間隔

    return () => clearInterval(interval)
  }, [autoRefresh])

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.3) return <TrendingUp className="h-4 w-4 text-neural-success" />
    if (sentiment < -0.3) return <TrendingDown className="h-4 w-4 text-neural-error" />
    return <BarChart3 className="h-4 w-4 text-neural-text-muted" />
  }

  const getImportanceBadge = (importance: number) => {
    if (importance >= 8) {
      return <Badge className="bg-neural-error/20 text-neural-error border-neural-error/30">緊急</Badge>
    }
    if (importance >= 6) {
      return <Badge className="bg-neural-warning/20 text-neural-warning border-neural-warning/30">重要</Badge>
    }
    return <Badge className="bg-neural-cyan/20 text-neural-cyan border-neural-cyan/30">通常</Badge>
  }

  const formatTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '今'
    if (minutes < 60) return `${minutes}分前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}時間前`
    const days = Math.floor(hours / 24)
    return `${days}日前`
  }

  const handleGenerateArticle = (newsItem: NewsItem) => {
    const params = new URLSearchParams({
      topic: newsItem.title,
      source: 'news',
      newsId: newsItem.id
    })
    router.push(`/content/workspace?${params.toString()}`)
    toast.success(`「${newsItem.title}」から記事を生成します`)
  }

  const filteredNews = newsItems.filter(item => {
    const searchLower = searchQuery.toLowerCase()
    
    // 検索条件（タイトル、要約、全タグを検索対象に）
    const allTags = [
      ...(item.topics || []),
      ...(item.coins || []),
      ...(item.companies || []),
      ...(item.products || []),
      ...(item.technology || []),
      ...(item.market || []),
      ...(item.regulatory || []),
      ...(item.regions || [])
    ]
    
    const matchesSearch = item.title.toLowerCase().includes(searchLower) ||
                         item.summary.toLowerCase().includes(searchLower) ||
                         allTags.some(tag => tag.toLowerCase().includes(searchLower))
    
    const matchesSource = selectedSource === 'all' || item.source === selectedSource
    const matchesImportance = selectedImportance === 'all' || 
                              (selectedImportance === 'high' && item.importance >= 8) ||
                              (selectedImportance === 'medium' && item.importance >= 6 && item.importance < 8) ||
                              (selectedImportance === 'low' && item.importance < 6)
    
    return matchesSearch && matchesSource && matchesImportance
  })


  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold neural-title neural-glow-text mb-2">
          News Feed
        </h1>
        <p className="text-neural-text-secondary">
          リアルタイムの仮想通貨ニュースとAI要約
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neural-text-muted" />
            <Input
              placeholder="ニュースを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 neural-input"
            />
          </div>
          
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 rounded-lg bg-neural-surface border border-neural-elevated text-neural-text-primary"
          >
            <option value="all">すべてのソース</option>
            {sources.slice(1).map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
          
          <select
            value={selectedImportance}
            onChange={(e) => setSelectedImportance(e.target.value)}
            className="px-3 py-2 rounded-lg bg-neural-surface border border-neural-elevated text-neural-text-primary"
          >
            <option value="all">すべての重要度</option>
            <option value="high">緊急</option>
            <option value="medium">重要</option>
            <option value="low">通常</option>
          </select>
          
          <NeuralButton
            variant="ghost"
            onClick={loadNewsData}
            disabled={loading}
            className="shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            更新
          </NeuralButton>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-neural-text-secondary">
            {filteredNews.length} 件のニュース
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                schedulerStatus?.isRunning 
                  ? "bg-green-400 animate-pulse" 
                  : "bg-red-400"
              )}></div>
              <span className="text-xs text-neural-text-secondary">
                {schedulerStatus?.isRunning ? 'RSS自動収集中' : 'RSS収集停止中'} (5分間隔)
              </span>
              {schedulerStatus && !schedulerStatus.isRunning && (
                <NeuralButton
                  variant="ghost"
                  size="sm"
                  onClick={startScheduler}
                  className="h-6 text-xs"
                >
                  開始
                </NeuralButton>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neural-text-secondary">自動更新</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn(
                  "w-10 h-6 rounded-full relative transition-colors",
                  autoRefresh ? "bg-neural-cyan" : "bg-neural-surface"
                )}
              >
                <div className={cn(
                  "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform",
                  autoRefresh ? "translate-x-5" : "translate-x-1"
                )} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* News Timeline - 1列レイアウト */}
      <div className="space-y-4 max-w-4xl mx-auto">
        {filteredNews.map((item) => (
          <NeuralCard key={item.id} className="hover:shadow-xl neural-transition">
            <div className="flex gap-4 p-4">
              {/* 左側: 画像とステータス */}
              <div className="flex flex-col items-center gap-3 w-20 flex-shrink-0">
                {item.imageUrl ? (
                  <SafeImage
                    src={item.imageUrl}
                    alt={item.title}
                    width={80}
                    height={80}
                    className="w-16 h-16 object-cover rounded-lg border border-neural-elevated"
                    fallbackIcon={<Newspaper className="h-6 w-6 text-neural-text-muted" />}
                  />
                ) : (
                  <div className="w-16 h-16 bg-neural-surface border border-neural-elevated rounded-lg flex items-center justify-center">
                    <Newspaper className="h-6 w-6 text-neural-text-muted" />
                  </div>
                )}
                <div className="flex flex-col items-center gap-1">
                  {getImportanceBadge(item.importance)}
                  {getSentimentIcon(item.sentiment)}
                </div>
              </div>

              {/* 右側: コンテンツ */}
              <div className="flex-1 space-y-3">
                {/* ヘッダー */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold neural-title leading-tight mb-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-neural-text-muted">
                      <Globe className="h-4 w-4" />
                      <span>{item.source}</span>
                      {item.author && (
                        <>
                          <span>•</span>
                          <span>{item.author}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatTimeAgo(item.publishedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* 要約 */}
                <p className="text-neural-text-secondary leading-relaxed">
                  {item.summary}
                </p>

                {/* AI要約 */}
                {item.aiSummary && (
                  <div className="p-3 neural-neumorphic-inset rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-neural-warning" />
                      <span className="text-sm font-medium neural-title">AI要約</span>
                    </div>
                    <p className="text-sm text-neural-text-secondary">
                      {item.aiSummary}
                    </p>
                  </div>
                )}

                {/* 構造化タグ表示 */}
                <div className="space-y-2">
                  {/* 通貨・トークン */}
                  {item.coins && item.coins.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.coins.slice(0, 6).map((coin, index) => (
                        <Badge key={`${item.id}-coin-${index}-${coin}`} className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                          💰 {typeof coin === 'string' ? coin : coin?.symbol || coin?.name || String(coin)}
                        </Badge>
                      ))}
                      {item.coins.length > 6 && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                          +{item.coins.length - 6}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* 企業・取引所 */}
                  {item.companies && item.companies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.companies.slice(0, 4).map((company, index) => (
                        <Badge key={`${item.id}-company-${index}-${company}`} className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                          🏢 {typeof company === 'string' ? company : company?.name || String(company)}
                        </Badge>
                      ))}
                      {item.companies.length > 4 && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                          +{item.companies.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* 金融商品・技術・市場・規制 */}
                  <div className="flex flex-wrap gap-1">
                    {item.products && item.products.slice(0, 3).map((product, index) => (
                      <Badge key={`${item.id}-product-${index}-${product}`} className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        📦 {typeof product === 'string' ? product : product?.name || String(product)}
                      </Badge>
                    ))}
                    {item.technology && item.technology.slice(0, 2).map((tech, index) => (
                      <Badge key={`${item.id}-tech-${index}-${tech}`} className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                        ⚙️ {typeof tech === 'string' ? tech : tech?.name || String(tech)}
                      </Badge>
                    ))}
                    {item.market && item.market.slice(0, 2).map((market, index) => (
                      <Badge key={`${item.id}-market-${index}-${market}`} className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                        📈 {typeof market === 'string' ? market : market?.name || String(market)}
                      </Badge>
                    ))}
                    {item.regulatory && item.regulatory.slice(0, 2).map((reg, index) => (
                      <Badge key={`${item.id}-reg-${index}-${reg}`} className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                        ⚖️ {typeof reg === 'string' ? reg : reg?.name || String(reg)}
                      </Badge>
                    ))}
                    {item.regions && item.regions.slice(0, 2).map((region, index) => (
                      <Badge key={`${item.id}-region-${index}-${region}`} className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-xs">
                        🌍 {typeof region === 'string' ? region : region?.name || String(region)}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* 一般トピック */}
                  {item.topics && item.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.topics.slice(0, 3).map((topic, index) => (
                        <Badge key={`${item.id}-topic-${index}-${topic}`} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {typeof topic === 'string' ? topic : topic?.name || String(topic)}
                        </Badge>
                      ))}
                      {item.topics.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.topics.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* アクションボタン */}
                <div className="flex gap-3 pt-2">
                  <NeuralButton
                    variant="gradient"
                    size="sm"
                    onClick={() => handleGenerateArticle(item)}
                    disabled={item.hasGeneratedArticle}
                    className="flex-shrink-0"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {item.hasGeneratedArticle ? '生成済み' : '記事生成'}
                  </NeuralButton>
                  
                  <NeuralButton
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(item.url, '_blank')}
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    ソースを開く
                  </NeuralButton>
                </div>
              </div>
            </div>
          </NeuralCard>
        ))}
      </div>

      {filteredNews.length === 0 && (
        <div className="text-center py-12">
          <Newspaper className="h-16 w-16 mx-auto text-neural-text-muted mb-4" />
          <h3 className="neural-title text-lg mb-2">ニュースが見つかりません</h3>
          <p className="text-neural-text-secondary">
            検索条件を変更するか、しばらく待ってから再度お試しください。
          </p>
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <NeuralButton
            variant="ghost"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            前へ
          </NeuralButton>
          <span className="px-4 py-2 text-neural-text-secondary">
            {page} / {totalPages}
          </span>
          <NeuralButton
            variant="ghost"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            次へ
          </NeuralButton>
        </div>
      )}
    </div>
  )
}