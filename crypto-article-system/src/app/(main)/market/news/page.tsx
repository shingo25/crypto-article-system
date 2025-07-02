'use client'

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
import Image from 'next/image'

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
  topics: string[]
  coins: string[]
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
  const [newsItems] = useState<NewsItem[]>(mockNewsItems)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState('all')
  const [selectedImportance, setSelectedImportance] = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadNewsData = async () => {
    setLoading(true)
    try {
      // 実際のAPIコールに置き換え
      await new Promise(resolve => setTimeout(resolve, 1000))
      // setNewsItems(newData)
      toast.success('ニュースを更新しました')
    } catch {
      toast.error('ニュースの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadNewsData()
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
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesSource = selectedSource === 'all' || item.source === selectedSource
    const matchesImportance = selectedImportance === 'all' || 
                              (selectedImportance === 'high' && item.importance >= 8) ||
                              (selectedImportance === 'medium' && item.importance >= 6 && item.importance < 8) ||
                              (selectedImportance === 'low' && item.importance < 6)
    
    return matchesSearch && matchesSource && matchesImportance
  })

  const sources = ['all', ...Array.from(new Set(newsItems.map(item => item.source)))]

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

      {/* News Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredNews.map((item) => (
          <NeuralCard key={item.id} className="hover:shadow-xl neural-transition">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {getImportanceBadge(item.importance)}
                  {getSentimentIcon(item.sentiment)}
                </div>
                <div className="text-xs text-neural-text-muted">
                  {formatTimeAgo(item.publishedAt)}
                </div>
              </div>
              
              <CardTitle className="text-base line-clamp-2 leading-tight">
                {item.title}
              </CardTitle>
              
              <div className="flex items-center gap-2 text-xs text-neural-text-muted">
                <Globe className="h-3 w-3" />
                <span>{item.source}</span>
                {item.author && (
                  <>
                    <span>•</span>
                    <span>{item.author}</span>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  width={400}
                  height={128}
                  className="w-full h-32 object-cover rounded-lg"
                />
              )}

              <p className="text-sm text-neural-text-secondary line-clamp-3">
                {item.summary}
              </p>

              {item.aiSummary && (
                <div className="p-3 neural-neumorphic-inset rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-3 w-3 text-neural-warning" />
                    <span className="text-xs font-medium neural-title">AI要約</span>
                  </div>
                  <p className="text-xs text-neural-text-secondary">
                    {item.aiSummary}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-1 flex-wrap">
                  {item.topics.slice(0, 3).map((topic) => (
                    <Badge key={topic} variant="outline" className="text-xs">
                      <Tag className="h-2 w-2 mr-1" />
                      {topic}
                    </Badge>
                  ))}
                  {item.topics.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{item.topics.length - 3}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1 flex-wrap">
                  {item.coins.map((coin) => (
                    <Badge key={coin} className="bg-neural-cyan/20 text-neural-cyan border-neural-cyan/30 text-xs">
                      {coin}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <NeuralButton
                  variant="gradient"
                  size="sm"
                  onClick={() => handleGenerateArticle(item)}
                  disabled={item.hasGeneratedArticle}
                  className="flex-1"
                >
                  <Sparkles className="h-3 w-3 mr-2" />
                  {item.hasGeneratedArticle ? '生成済み' : '記事生成'}
                </NeuralButton>
                
                <NeuralButton
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(item.url, '_blank')}
                  className="shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </NeuralButton>
              </div>
            </CardContent>
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
    </div>
  )
}