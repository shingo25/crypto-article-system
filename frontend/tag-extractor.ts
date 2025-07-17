/**
 * 高度なタグ抽出システム
 * ニュース記事から構造化されたタグを自動抽出する
 */

interface ExtractedTags {
  currencies: string[]
  companies: string[]
  products: string[]
  technology: string[]
  market: string[]
  regulatory: string[]
  regions: string[]
  general: string[]
}

// タグ辞書
const TAG_DICTIONARY = {
  currencies: [
    // メジャー通貨
    'BTC', 'Bitcoin', 'ETH', 'Ethereum', 'SOL', 'Solana', 'XRP', 'Ripple',
    'ADA', 'Cardano', 'DOT', 'Polkadot', 'AVAX', 'Avalanche', 'LINK', 'Chainlink',
    'MATIC', 'Polygon', 'UNI', 'Uniswap', 'ATOM', 'Cosmos', 'NEAR',
    
    // ステーブルコイン
    'USDC', 'USDT', 'Tether', 'DAI', 'BUSD', 'FRAX',
    
    // ミームコイン
    'DOGE', 'Dogecoin', 'SHIB', 'Shiba', 'PEPE', 'BONK', 'WIF',
    
    // DeFi トークン
    'AAVE', 'COMP', 'Compound', 'MKR', 'Maker', 'CRV', 'Curve',
    'SUSHI', 'YFI', 'Yearn', '1INCH',
    
    // Layer 2
    'ARB', 'Arbitrum', 'OP', 'Optimism', 'LRC', 'Loopring',
    
    // その他アルトコイン
    'BNB', 'Binance', 'FTT', 'ALGO', 'Algorand', 'XLM', 'Stellar',
    'VET', 'VeChain', 'THETA', 'FIL', 'Filecoin'
  ],
  
  companies: [
    // 取引所
    'Coinbase', 'Binance', 'Kraken', 'Bitstamp', 'Gemini', 'KuCoin', 'Bybit',
    'OKX', 'Huobi', 'Gate.io', 'Bitfinex', 'FTX',
    
    // 伝統的金融
    'BlackRock', 'Fidelity', 'Vanguard', 'JPMorgan', 'Goldman Sachs',
    'Morgan Stanley', 'Wells Fargo', 'Bank of America', 'Citigroup',
    'Deutsche Bank', 'UBS', 'Credit Suisse',
    
    // 技術企業
    'Microsoft', 'Tesla', 'MicroStrategy', 'Square', 'PayPal', 'Visa',
    'Mastercard', 'IBM', 'Oracle', 'Amazon', 'Google', 'Meta',
    
    // 暗号資産企業
    'Ripple', 'Circle', 'Tether', 'Consensys', 'Chainanalysis',
    'Elliptic', 'Chainalysis', 'Alchemy', 'Infura',
    
    // 投資ファンド
    'Grayscale', 'Galaxy Digital', 'Pantera', 'a16z', 'Paradigm',
    'Polychain', 'Electric Capital', 'Coinbase Ventures'
  ],
  
  products: [
    // 金融商品
    'ETF', 'ETP', 'Futures', 'Options', 'Derivatives', 'Spot Trading',
    'Margin Trading', 'Perpetual', 'Staking', 'Yield Farming',
    'Liquidity Mining', 'DeFi', 'Lending', 'Borrowing',
    
    // 投資商品
    'Index Fund', 'Mutual Fund', 'Trust', 'REIT', 'Bond', 'Note',
    'Convertible', 'Warrant', 'Rights', 'Structured Product',
    
    // 暗号資産商品
    'NFT', 'Tokenized Assets', 'Carbon Credits', 'RWA', 'STO',
    'ICO', 'IEO', 'IDO', 'Launchpad', 'Airdrop'
  ],
  
  technology: [
    // ブロックチェーン技術
    'Blockchain', 'Smart Contracts', 'DApps', 'Web3', 'Metaverse',
    'Layer 1', 'Layer 2', 'Scaling', 'Sharding', 'Consensus',
    'Proof of Stake', 'Proof of Work', 'Validator', 'Node',
    
    // DeFi技術
    'AMM', 'Liquidity Pool', 'Flash Loan', 'Yield', 'Governance',
    'DAO', 'Multi-sig', 'Bridge', 'Cross-chain', 'Interoperability',
    
    // セキュリティ
    'Audit', 'Bug Bounty', 'Vulnerability', 'Exploit', 'Hack',
    'Security', 'Privacy', 'Zero Knowledge', 'ZK-SNARK'
  ],
  
  market: [
    // 価格動向
    'Surge', 'Rally', 'Bull Run', 'Bear Market', 'Correction',
    'Consolidation', 'Breakout', 'Resistance', 'Support',
    'Golden Cross', 'Death Cross', 'MACD', 'RSI',
    
    // 取引指標
    'Volume', 'Open Interest', 'Funding Rate', 'Long/Short Ratio',
    'Fear and Greed', 'Volatility', 'Correlation', 'Market Cap',
    
    // 投資戦略
    'HODL', 'DCA', 'Treasury Strategy', 'Institutional Adoption',
    'Retail Interest', 'Whale Activity', 'Flow', 'Accumulation'
  ],
  
  regulatory: [
    // 規制機関
    'SEC', 'CFTC', 'FINRA', 'OCC', 'Federal Reserve', 'Treasury',
    'FinCEN', 'IRS', 'DOJ', 'FBI',
    
    // 規制用語
    'Approval', 'License', 'Compliance', 'KYC', 'AML', 'Sanctions',
    'Enforcement', 'Investigation', 'Lawsuit', 'Settlement',
    'Guidance', 'Framework', 'Regulation', 'Policy',
    
    // 法的手続き
    'Bankruptcy', 'Liquidation', 'Court', 'Judge', 'Hearing',
    'Filing', 'Appeal', 'Injunction', 'Subpoena'
  ],
  
  regions: [
    'US', 'USA', 'America', 'Europe', 'EU', 'Asia', 'China', 'Japan',
    'Korea', 'Singapore', 'Hong Kong', 'India', 'Australia',
    'Canada', 'UK', 'Germany', 'France', 'Switzerland', 'Dubai'
  ]
}

export class TagExtractor {
  /**
   * ニュース記事からタグを抽出
   */
  extractTags(title: string, summary: string, content?: string): ExtractedTags {
    const text = `${title} ${summary} ${content || ''}`.toLowerCase()
    
    const extracted: ExtractedTags = {
      currencies: [],
      companies: [],
      products: [],
      technology: [],
      market: [],
      regulatory: [],
      regions: [],
      general: []
    }
    
    // 各カテゴリから関連タグを抽出
    Object.entries(TAG_DICTIONARY).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i')
        if (regex.test(text)) {
          const normalizedTag = this.normalizeTag(keyword)
          if (!extracted[category as keyof ExtractedTags].includes(normalizedTag)) {
            extracted[category as keyof ExtractedTags].push(normalizedTag)
          }
        }
      })
    })
    
    // 通貨のティッカーシンボルを抽出
    this.extractCurrencyTickers(text, extracted)
    
    // 一般的なトピックを追加
    this.extractGeneralTopics(title, summary, extracted)
    
    return extracted
  }
  
  /**
   * 通貨ティッカーシンボルを抽出
   */
  private extractCurrencyTickers(text: string, extracted: ExtractedTags): void {
    // 通貨ペアパターン（例: BTC/USD, ETH-USDT）
    const pairPattern = /([A-Z]{2,5})[\/-]([A-Z]{2,5})/g
    const pairs = text.match(pairPattern)
    
    if (pairs) {
      pairs.forEach(pair => {
        const [base, quote] = pair.split(/[\/-]/)
        if (base && !extracted.currencies.includes(base)) {
          extracted.currencies.push(base)
        }
        if (quote && !extracted.currencies.includes(quote)) {
          extracted.currencies.push(quote)
        }
      })
    }
    
    // 単独のティッカーシンボル（$BTC, $ETH形式）
    const tickerPattern = /\$([A-Z]{2,5})\b/g
    const tickers = text.match(tickerPattern)
    
    if (tickers) {
      tickers.forEach(ticker => {
        const symbol = ticker.replace('$', '')
        if (!extracted.currencies.includes(symbol)) {
          extracted.currencies.push(symbol)
        }
      })
    }
  }
  
  /**
   * 一般的なトピックを抽出
   */
  private extractGeneralTopics(title: string, summary: string, extracted: ExtractedTags): void {
    const text = `${title} ${summary}`.toLowerCase()
    
    // ニュースカテゴリを推測
    if (text.includes('price') || text.includes('surge') || text.includes('rally')) {
      extracted.general.push('Price Action')
    }
    
    if (text.includes('launch') || text.includes('debut') || text.includes('release')) {
      extracted.general.push('Product Launch')
    }
    
    if (text.includes('partnership') || text.includes('collaboration')) {
      extracted.general.push('Partnership')
    }
    
    if (text.includes('acquisition') || text.includes('merger')) {
      extracted.general.push('M&A')
    }
    
    if (text.includes('hack') || text.includes('exploit') || text.includes('vulnerability')) {
      extracted.general.push('Security')
    }
    
    if (text.includes('adoption') || text.includes('integration')) {
      extracted.general.push('Adoption')
    }
  }
  
  /**
   * タグを正規化
   */
  private normalizeTag(tag: string): string {
    // 大文字小文字を適切に調整
    if (tag.length <= 4 && tag.toUpperCase() === tag) {
      return tag.toUpperCase() // ティッカーシンボル
    }
    
    // 最初の文字を大文字に
    return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase()
  }
  
  /**
   * フラット化されたタグリストを取得
   */
  getFlatTags(extractedTags: ExtractedTags): string[] {
    const allTags: string[] = []
    
    Object.values(extractedTags).forEach(categoryTags => {
      allTags.push(...categoryTags)
    })
    
    return [...new Set(allTags)] // 重複除去
  }
  
  /**
   * カテゴリ別のタグ統計を取得
   */
  getTagStatistics(extractedTags: ExtractedTags): Record<string, number> {
    const stats: Record<string, number> = {}
    
    Object.entries(extractedTags).forEach(([category, tags]) => {
      stats[category] = tags.length
    })
    
    return stats
  }
}

// シングルトンインスタンス
export const tagExtractor = new TagExtractor()