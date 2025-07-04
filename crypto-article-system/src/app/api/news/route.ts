import { NextRequest, NextResponse } from 'next/server'

// モックニュースデータ（Prismaが利用できない場合のフォールバック）
const mockNewsItems = [
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
    companies: [],
    products: ['ETF'],
    technology: [],
    market: ['Bull Market'],
    regulatory: [],
    regions: ['US'],
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
    companies: [],
    products: ['Staking'],
    technology: ['Proof of Stake'],
    market: ['DeFi'],
    regulatory: [],
    regions: [],
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
    companies: [],
    products: ['DeFi Protocol'],
    technology: ['Smart Contract'],
    market: [],
    regulatory: [],
    regions: [],
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
    companies: [],
    products: ['NFT'],
    technology: ['Blockchain'],
    market: ['NFT Market'],
    regulatory: [],
    regions: [],
    hasGeneratedArticle: false,
    publishedAt: '2024-01-15T12:45:00Z',
    createdAt: '2024-01-15T12:50:00Z'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '15', 10)
    const search = searchParams.get('search') || ''
    const source = searchParams.get('source') || 'all'
    const importance = searchParams.get('importance') || 'all'

    // モックデータでフィルタリング
    let filteredItems = mockNewsItems

    // 検索フィルター
    if (search) {
      const searchLower = search.toLowerCase()
      filteredItems = filteredItems.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.summary.toLowerCase().includes(searchLower) ||
        item.topics.some((topic: string) => topic.toLowerCase().includes(searchLower)) ||
        item.coins.some((coin: string) => coin.toLowerCase().includes(searchLower))
      )
    }

    // ソースフィルター
    if (source !== 'all') {
      filteredItems = filteredItems.filter(item => item.source === source)
    }

    // 重要度フィルター
    if (importance !== 'all') {
      filteredItems = filteredItems.filter(item => {
        if (importance === 'high') return item.importance >= 8
        if (importance === 'medium') return item.importance >= 6 && item.importance < 8
        if (importance === 'low') return item.importance < 6
        return true
      })
    }

    // ページネーション
    const total = filteredItems.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedItems = filteredItems.slice(startIndex, endIndex)

    // ユニークなソース一覧を取得
    const sources = [...new Set(mockNewsItems.map(item => item.source))]

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedItems,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        },
        sources
      }
    })
  } catch (error) {
    console.error('News API error:', error)
    return NextResponse.json(
      { success: false, error: 'ニュースの取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // RSS収集を開始する処理（モック実装）
    console.log('RSS収集を開始しました')
    
    return NextResponse.json({
      success: true,
      message: 'RSS収集を開始しました'
    })
  } catch (error) {
    console.error('RSS collection start error:', error)
    return NextResponse.json(
      { success: false, error: 'RSS収集の開始に失敗しました' },
      { status: 500 }
    )
  }
}