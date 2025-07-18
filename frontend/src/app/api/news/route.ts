import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

// 高精度のタグ生成関数
function generateAccurateTags(title: string, summary: string) {
  const text = (title + ' ' + summary).toLowerCase()
  
  // 仮想通貨検出
  const coins = []
  const coinPatterns = {
    'ビットコイン|bitcoin|btc': 'BTC',
    'イーサリアム|ethereum|eth': 'ETH', 
    'ソラナ|solana|sol': 'SOL',
    'カルダノ|cardano|ada': 'ADA',
    'チェーンリンク|chainlink|link': 'LINK',
    'ポリゴン|polygon|matic': 'MATIC',
    'ユニスワップ|uniswap|uni': 'UNI',
    'pepe': 'PEPE',
    'dogecoin|doge': 'DOGE',
    'shiba|shib': 'SHIB',
    'sui': 'SUI',
    'near': 'NEAR'
  }
  
  for (const [pattern, coin] of Object.entries(coinPatterns)) {
    if (new RegExp(pattern).test(text)) coins.push(coin)
  }
  
  // テクノロジー分類
  const technology = []
  if (/defi|decentralized.finance|yield|liquidity|分散型金融/.test(text)) technology.push('DeFi')
  if (/nft|non.fungible|collectible|art|非代替/.test(text)) technology.push('NFT')
  if (/layer.?2|scaling|rollup|lightning|レイヤー/.test(text)) technology.push('Layer 2')
  if (/smart.contract|solidity|evm|スマートコントラクト/.test(text)) technology.push('Smart Contracts')
  if (/staking|validator|consensus|proof.of.stake|ステーキング|バリデータ/.test(text)) technology.push('Staking')
  if (/bridge|cross.chain|interoperability|ブリッジ|相互運用/.test(text)) technology.push('Cross-chain')
  if (/dao|governance|voting|ガバナンス/.test(text)) technology.push('DAO')
  if (/metaverse|virtual|gaming|メタバース/.test(text)) technology.push('Metaverse')
  
  // 市場分類
  const market = []
  if (/bull.market|bullish|surge|rally|pump|急上昇|上昇|高騰/.test(text)) market.push('Bull Market')
  if (/bear.market|bearish|crash|dump|decline|下落|暴落/.test(text)) market.push('Bear Market')
  if (/volatility|volatile|swing|ボラティリティ|変動/.test(text)) market.push('High Volatility')
  if (/adoption|mainstream|institutional|採用|導入|機関投資家/.test(text)) market.push('Adoption')
  if (/trading|volume|liquidity|取引|流動性/.test(text)) market.push('Trading')
  
  // 規制関連
  const regulatory = []
  if (/sec|securities|regulation|compliance|証券取引委員会|規制|コンプライアンス/.test(text)) regulatory.push('SEC')
  if (/tax|taxation|irs|税金|課税/.test(text)) regulatory.push('Taxation')
  if (/ban|banned|restriction|禁止|規制/.test(text)) regulatory.push('Restrictions')
  if (/legal|lawsuit|court|法的|訴訟|裁判/.test(text)) regulatory.push('Legal')
  if (/cbdc|central.bank|中央銀行|デジタル通貨/.test(text)) regulatory.push('CBDC')
  
  // トピック分類
  const topics = []
  if (/etf|exchange.traded.fund|上場投資信託/.test(text)) topics.push('ETF')
  if (/institutional|institution|fund|bank|機関投資家|金融機関/.test(text)) topics.push('Institutional')
  if (/security|hack|exploit|vulnerability|セキュリティ|ハック|脆弱性/.test(text)) topics.push('Security')
  if (/partnership|collaboration|integration|パートナーシップ|提携|統合/.test(text)) topics.push('Partnership')
  if (/launch|release|announcement|ローンチ|発表|リリース/.test(text)) topics.push('Launch')
  if (/upgrade|update|improvement|アップグレード|更新|改善/.test(text)) topics.push('Upgrade')
  if (/price|value|worth|cost|価格|価値|コスト/.test(text)) topics.push('Price Analysis')
  
  // 企業/プロダクト
  const companies = []
  const products = []
  if (/coinbase|binance|kraken|ftx/.test(text)) companies.push('Exchange')
  if (/tesla|microsoft|microstrategy/.test(text)) companies.push('Corporate')
  if (/blackrock|fidelity|grayscale/.test(text)) companies.push('Asset Manager')
  
  return { coins, technology, market, regulatory, topics, companies, products }
}

// 重要度計算関数（改良版）
function calculateImportance(title: string, summary: string, tags: any) {
  let score = 5 // 基本スコア
  
  const text = (title + ' ' + summary).toLowerCase()
  
  // 緊急度キーワード
  if (/breaking|urgent|alert|critical/.test(text)) score += 3
  if (/crash|hack|exploit|ban/.test(text)) score += 2
  if (/surge|rally|breakthrough|record/.test(text)) score += 2
  
  // 通貨の重要度
  if (tags.coins.includes('BTC')) score += 2
  if (tags.coins.includes('ETH')) score += 1.5
  if (['SOL', 'ADA', 'LINK'].some(coin => tags.coins.includes(coin))) score += 1
  
  // カテゴリ重要度
  if (tags.regulatory.length > 0) score += 2
  if (tags.topics.includes('ETF')) score += 1.5
  if (tags.topics.includes('Security')) score += 1.5
  if (tags.topics.includes('Institutional')) score += 1
  
  // テクノロジー重要度
  if (tags.technology.includes('DeFi')) score += 0.5
  if (tags.technology.includes('Layer 2')) score += 0.5
  
  // 市場状況
  if (tags.market.includes('Bull Market') || tags.market.includes('Bear Market')) score += 1
  
  return Math.min(Math.max(Math.round(score), 1), 10)
}

// モックニュースデータ（改良版）
const mockNewsItems = [
  (() => {
    const data = {
      id: '1',
      title: 'ビットコインETFへの資金流入が記録的水準に到達',
      summary: '機関投資家からの継続的な資金流入により、ビットコインETFが新たな記録を樹立。市場への影響と今後の見通しを専門家が分析。',
      content: 'ビットコインETFへの資金流入が過去最高を記録し、機関投資家の仮想通貨への関心の高まりを示している...',
      url: 'https://example.com/news/btc-etf-inflow-record',
      imageUrl: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png',
      source: 'CryptoNews',
      author: 'Market Analyst',
      sentiment: 0.8,
      aiSummary: 'ビットコインETFが記録的な資金流入を記録。機関投資家の参入が加速し、価格上昇の要因となっている。',
      regions: ['US'],
      hasGeneratedArticle: false,
      publishedAt: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-15T10:35:00Z'
    }
    const tags = generateAccurateTags(data.title, data.summary)
    return {
      ...data,
      ...tags,
      importance: calculateImportance(data.title, data.summary, tags)
    }
  })(),
  (() => {
    const data = {
      id: '2',
      title: 'イーサリアム2.0のステーキング報酬率が上昇',
      summary: 'ネットワークの利用増加により、イーサリアム2.0のステーキング報酬率が予想を上回る水準まで上昇。バリデータへの影響を解説。',
      url: 'https://example.com/news/eth-staking-rewards',
      imageUrl: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png',
      source: 'ETH News',
      author: 'Technical Writer',
      sentiment: 0.6,
      aiSummary: 'イーサリアムのステーキング報酬率が上昇。ネットワーク活動の増加が主な要因。',
      regions: [],
      hasGeneratedArticle: true,
      publishedAt: '2024-01-15T08:15:00Z',
      createdAt: '2024-01-15T08:20:00Z'
    }
    const tags = generateAccurateTags(data.title, data.summary)
    return {
      ...data,
      ...tags,
      importance: calculateImportance(data.title, data.summary, tags)
    }
  })(),
  (() => {
    const data = {
      id: '3',
      title: 'DeFiプロトコルで新たなセキュリティ脆弱性を発見',
      summary: 'セキュリティ研究者が人気DeFiプロトコルで重大な脆弱性を発見。開発チームは緊急パッチを準備中。',
      url: 'https://example.com/news/defi-security-vulnerability',
      source: 'Security Alert',
      author: 'Security Researcher',
      sentiment: -0.7,
      aiSummary: 'DeFiプロトコルでセキュリティ脆弱性が発見。緊急対応が必要な状況。',
      regions: [],
      hasGeneratedArticle: false,
      publishedAt: '2024-01-15T14:20:00Z',
      createdAt: '2024-01-15T14:25:00Z'
    }
    const tags = generateAccurateTags(data.title, data.summary)
    return {
      ...data,
      ...tags,
      importance: calculateImportance(data.title, data.summary, tags)
    }
  })(),
  (() => {
    const data = {
      id: '4',
      title: 'Solana生態系での新プロジェクト発表により価格上昇',
      summary: 'Solana上で革新的なNFTプロジェクトが発表され、SOLトークンの価格が急上昇。エコシステムの成長に注目。',
      url: 'https://example.com/news/solana-new-project',
      imageUrl: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png',
      source: 'Solana News',
      author: 'Blockchain Reporter',
      sentiment: 0.5,
      aiSummary: 'Solana上での新プロジェクト発表がSOL価格の上昇要因となっている。',
      regions: [],
      hasGeneratedArticle: false,
      publishedAt: '2024-01-15T12:45:00Z',
      createdAt: '2024-01-15T12:50:00Z'
    }
    const tags = generateAccurateTags(data.title, data.summary)
    return {
      ...data,
      ...tags,
      importance: calculateImportance(data.title, data.summary, tags)
    }
  })(),
  (() => {
    const data = {
      id: '5',
      title: 'SEC、主要な暗号通貨取引所に対して新たな規制案を発表',
      summary: '米国証券取引委員会（SEC）が、暗号通貨取引所に対する包括的な規制フレームワークを発表。業界への影響は甚大。',
      url: 'https://example.com/news/sec-crypto-regulation',
      source: 'Regulatory News',
      author: 'Legal Correspondent',
      sentiment: -0.4,
      aiSummary: 'SECが新しい暗号通貨規制を発表。取引所への影響と市場の反応が注目される。',
      regions: ['US'],
      hasGeneratedArticle: false,
      publishedAt: '2024-01-15T16:00:00Z',
      createdAt: '2024-01-15T16:05:00Z'
    }
    const tags = generateAccurateTags(data.title, data.summary)
    return {
      ...data,
      ...tags,
      importance: calculateImportance(data.title, data.summary, tags)
    }
  })(),
  (() => {
    const data = {
      id: '6',
      title: 'Layer 2ソリューションの導入が加速、取引手数料が大幅削減',
      summary: 'イーサリアムのLayer 2ソリューションの導入が進み、取引手数料が90%削減。スケーラビリティ問題の解決に前進。',
      url: 'https://example.com/news/layer2-scaling',
      source: 'Tech Analysis',
      author: 'Blockchain Engineer',
      sentiment: 0.7,
      aiSummary: 'Layer 2技術の進歩により、イーサリアムの手数料問題が大幅に改善している。',
      regions: [],
      hasGeneratedArticle: false,
      publishedAt: '2024-01-15T11:30:00Z',
      createdAt: '2024-01-15T11:35:00Z'
    }
    const tags = generateAccurateTags(data.title, data.summary)
    return {
      ...data,
      ...tags,
      importance: calculateImportance(data.title, data.summary, tags)
    }
  })(),
  (() => {
    const data = {
      id: '7',
      title: 'PEPEコインが急騰、ミームコイン市場に新たな動き',
      summary: 'ミームコインPEPEが24時間で30%上昇し、DOGEやSHIBなどの他のミームコインも連動して価格上昇。コミュニティの注目度が高まっている。',
      url: 'https://example.com/news/pepe-coin-surge',
      source: 'Meme Coin News',
      author: 'Crypto Enthusiast',
      sentiment: 0.8,
      aiSummary: 'PEPEコインの急騰がミームコイン市場全体を押し上げ、投資家の注目を集めている。',
      regions: [],
      hasGeneratedArticle: false,
      publishedAt: '2024-01-15T17:30:00Z',
      createdAt: '2024-01-15T17:35:00Z'
    }
    const tags = generateAccurateTags(data.title, data.summary)
    return {
      ...data,
      ...tags,
      importance: calculateImportance(data.title, data.summary, tags)
    }
  })()
]

export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '15', 10)
    const search = searchParams.get('search') || ''
    const source = searchParams.get('source') || 'all'
    const importance = searchParams.get('importance') || 'all'
    const useConfiguredSources = searchParams.get('use_configured_sources') === 'true'

    let filteredItems = mockNewsItems

    // 設定されたRSSソースからニュースを取得する場合
    if (useConfiguredSources) {
      try {
        // 有効なRSSソースを取得
        const sources = await prisma.rSSSource.findMany({
          where: { enabled: true }
        })

        if (sources.length > 0) {
          // データベースから最新のニュースアイテムを取得
          const newsItems = await prisma.newsItem.findMany({
            orderBy: { publishedAt: 'desc' },
            take: limit * 2 // 余裕を持って取得
          })

          // データベースにニュースがある場合は、それを使用
          if (newsItems.length > 0) {
            const dbItems = newsItems.map(item => {
              // タグを生成
              const tags = generateAccurateTags(item.title, item.summary || '')
              const importance = calculateImportance(item.title, item.summary || '', tags)
              
              return {
                id: item.id,
                title: item.title,
                summary: item.summary || '',
                content: item.content || '',
                url: item.url,
                imageUrl: item.imageUrl || undefined,
                source: item.source,
                author: item.author || 'Unknown',
                sentiment: item.sentiment || 0,
                importance: importance,
                aiSummary: item.aiSummary || '',
                ...tags, // 生成されたタグを展開
                regions: (item.regions as string[]) || [],
                hasGeneratedArticle: false,
                publishedAt: item.publishedAt.toISOString(),
                createdAt: item.createdAt.toISOString()
              }
            })
            // モックデータの代わりにデータベースのデータを使用
            filteredItems = dbItems
            console.log(`データベースから${dbItems.length}件のニュースを取得`)
          } else {
            console.log('データベースにニュースがありません。モックデータを使用します。')
          }
        } else {
          console.log('有効なRSSソースがありません。モックデータを使用します。')
        }
      } catch (dbError) {
        console.error('Database error, using mock data:', dbError)
        // データベースエラーの場合はモックデータを使用
      }
    }

    // モックデータでフィルタリング

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