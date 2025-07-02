import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// モックコンテンツ生成ヘルパー
function generateMockContent(topic: Topic, settings: GenerationSettings): string {
  const coins = topic.coins.join(', ')
  const date = new Date().toLocaleDateString('ja-JP')
  
  const styleMap = {
    professional: {
      tone: '詳細な分析を通じて',
      conclusion: '今後の市場動向に注視が必要です。'
    },
    casual: {
      tone: 'わかりやすく解説すると',
      conclusion: '引き続き注目していきましょう！'
    },
    analytical: {
      tone: 'データに基づく分析によると',
      conclusion: '統計的な観点から継続的な監視が推奨されます。'
    },
    technical: {
      tone: 'テクニカル指標を用いた解析では',
      conclusion: 'アルゴリズム分析の結果、慎重な判断が求められます。'
    }
  }

  const lengthMap = {
    short: 300,
    medium: 600,
    long: 1000
  }

  const style = styleMap[settings.style]
  const targetLength = lengthMap[settings.length]
  
  let content = `# ${topic.summary}\n\n`
  
  content += `## 概要\n\n${date}時点での${coins}に関する市場分析レポートです。${style.tone}、現在の市場状況と今後の展望について考察します。\n\n`
  
  content += `## 主要ポイント\n\n`
  content += `- **対象通貨**: ${coins}\n`
  content += `- **分析時点**: ${date}\n`
  content += `- **市場センチメント**: ${settings.tone === 'bullish' ? '強気' : settings.tone === 'bearish' ? '弱気' : '中立'}\n\n`
  
  content += `## 市場動向分析\n\n`
  content += `${coins}の現在の市場状況を分析すると、複数の要因が価格動向に影響を与えています。${style.tone}、以下の点が特に注目されます：\n\n`
  
  content += `### テクニカル分析\n\n`
  content += `- チャートパターンからは${settings.tone === 'bullish' ? '上昇' : settings.tone === 'bearish' ? '下降' : '横ばい'}トレンドが確認されています\n`
  content += `- ボリューム指標は${Math.floor(Math.random() * 30 + 70)}%の水準で推移\n`
  content += `- RSIは${Math.floor(Math.random() * 40 + 30)}付近で${settings.tone === 'bullish' ? '買い' : settings.tone === 'bearish' ? '売り' : '中立'}シグナルを示唆\n\n`
  
  if (settings.length !== 'short') {
    content += `### ファンダメンタル要因\n\n`
    content += `市場の基本的な要因として、以下の点が重要です：\n\n`
    content += `- 規制環境の変化\n`
    content += `- 機関投資家の動向\n`
    content += `- 技術開発の進展\n`
    content += `- マクロ経済指標の影響\n\n`
    
    if (settings.length === 'long') {
      content += `### リスク分析\n\n`
      content += `投資判断においては、以下のリスク要因も考慮する必要があります：\n\n`
      content += `- **ボラティリティリスク**: 価格変動の大きさ\n`
      content += `- **流動性リスク**: 市場での売買のしやすさ\n`
      content += `- **規制リスク**: 法的環境の変化\n`
      content += `- **技術リスク**: プロトコルやセキュリティの問題\n\n`
      
      content += `### 今後の展望\n\n`
      content += `短期的には${settings.tone === 'bullish' ? '上昇' : settings.tone === 'bearish' ? '調整' : '方向感のない'}動きが予想されます。中長期的な視点では、以下の要因が重要になると考えられます：\n\n`
      content += `1. 市場の成熟度向上\n`
      content += `2. 制度整備の進展\n`
      content += `3. 技術革新の継続\n`
      content += `4. 採用拡大の加速\n\n`
    }
  }
  
  if (settings.seoOptimized) {
    content += `## よくある質問（FAQ）\n\n`
    content += `**Q: ${coins}への投資は今が買い時ですか？**\n`
    content += `A: 投資判断は個人の責任において行ってください。十分なリスク管理と情報収集が重要です。\n\n`
    content += `**Q: 今後の価格予想は？**\n`
    content += `A: 市場は常に変動しており、正確な予想は困難です。複数の指標を総合的に判断することが大切です。\n\n`
  }
  
  content += `## まとめ\n\n`
  content += `${coins}の市場分析を通じて、現在の状況と今後の見通しについて考察しました。${style.conclusion}\n\n`
  
  if (settings.seoOptimized) {
    content += `---\n\n`
    content += `*この記事は${date}時点の情報に基づいています。投資判断は自己責任で行ってください。*\n\n`
    content += `**関連キーワード**: ${topic.coins.join(', ')}, 仮想通貨, ブロックチェーン, 投資分析, 市場動向`
  }
  
  return content
}

// Topic型定義（既存のTypeScript型と整合）
export interface Topic {
  id: string
  coins: string[]
  summary: string
  timestamp: string
  status: 'active' | 'pending' | 'archived'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  tags: string[]
}

// Article型定義
export interface Article {
  id: string
  topicId: string
  title: string
  content: string
  status: 'draft' | 'generating' | 'review' | 'published'
  createdAt: string
  updatedAt: string
  metadata: {
    wordCount: number
    readingTime: number
    keywords: string[]
    seoScore?: number
    sentiment?: string
    language?: string
    updatedAt: string
  }
}

// Generation状態
export interface GenerationState {
  isGenerating: boolean
  progress: number
  currentStep: string
  stage: 'idle' | 'analyzing' | 'writing' | 'optimizing' | 'finalizing' | 'completed' | 'error'
  startedAt: Date | null
  error: string | null
  estimatedTime?: number
}

// Generation設定
export interface GenerationSettings {
  style: 'professional' | 'casual' | 'analytical' | 'technical'
  length: 'short' | 'medium' | 'long'
  includeImages: boolean
  seoOptimized: boolean
  tone: 'neutral' | 'bullish' | 'bearish'
}

// Workspace全体の状態
export interface WorkspaceState {
  // Topics
  topics: Topic[]
  selectedTopic: Topic | null
  topicFilter: 'all' | 'urgent' | 'high' | 'medium' | 'low'
  setTopics: (topics: Topic[]) => void
  selectTopic: (topic: Topic | null) => void
  setTopicFilter: (filter: 'all' | 'urgent' | 'high' | 'medium' | 'low') => void

  // Articles
  currentArticle: Article | null
  setCurrentArticle: (article: Article | null) => void
  updateArticleContent: (content: string) => void
  saveArticle: () => Promise<void>

  // Generation
  generationState: GenerationState
  generationSettings: GenerationSettings
  setGenerationState: (state: GenerationState) => void
  updateGenerationSettings: (settings: Partial<GenerationSettings>) => void
  startGeneration: () => Promise<void>

  // UI State
  activeColumn: 'topics' | 'generation' | 'preview'
  previewMode: 'edit' | 'preview' | 'split'
  setActiveColumn: (column: 'topics' | 'generation' | 'preview') => void
  setPreviewMode: (mode: 'edit' | 'preview' | 'split') => void

  // Actions
  resetWorkspace: () => void
}


// 初期状態
const initialGenerationState: GenerationState = {
  isGenerating: false,
  progress: 0,
  currentStep: '',
  stage: 'idle',
  startedAt: null,
  error: null,
  estimatedTime: undefined
}

const initialGenerationSettings: GenerationSettings = {
  style: 'professional',
  length: 'medium',
  includeImages: true,
  seoOptimized: true,
  tone: 'neutral'
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    (set, get) => ({
      // 初期状態
      topics: [],
      selectedTopic: null,
      topicFilter: 'all',
      currentArticle: null,
      generationState: initialGenerationState,
      generationSettings: initialGenerationSettings,
      activeColumn: 'topics',
      previewMode: 'split',

      // Topics管理
      setTopics: (topics) => set({ topics }, false, 'setTopics'),
      selectTopic: (topic) => set({ selectedTopic: topic }, false, 'selectTopic'),
      setTopicFilter: (filter) => set({ topicFilter: filter }, false, 'setTopicFilter'),

      // Article設定
      setCurrentArticle: (article) => {
        set(
          { currentArticle: article },
          false,
          'setCurrentArticle'
        )
      },

      // Generation管理
      setGenerationState: (state) => set({ generationState: state }, false, 'setGenerationState'),
      updateGenerationSettings: (settings) => set(
        (state) => ({ generationSettings: { ...state.generationSettings, ...settings } }),
        false,
        'updateGenerationSettings'
      ),

      // アクティブカラム変更
      setActiveColumn: (column) => {
        set(
          { activeColumn: column },
          false,
          'setActiveColumn'
        )
      },

      // プレビューモード変更
      setPreviewMode: (mode) => {
        set(
          { previewMode: mode },
          false,
          'setPreviewMode'
        )
      },


      // 記事生成開始
      startGeneration: async () => {
        const { selectedTopic, setGenerationState, setCurrentArticle, generationSettings } = get()
        if (!selectedTopic) return

        try {
          // 生成開始
          setGenerationState({
            isGenerating: true,
            progress: 0,
            currentStep: 'Analyzing topic and market data...',
            stage: 'analyzing',
            startedAt: new Date(),
            error: null,
            estimatedTime: 15
          })

          // 実際のAPI呼び出しを試行（フォールバック付き）
          try {
            // APIClientからarticle generation APIを呼び出し
            const { apiClient } = await import('@/lib/api')
            
            setGenerationState({ 
              ...get().generationState, 
              progress: 20, 
              currentStep: 'Connecting to AI model...',
              stage: 'analyzing',
              estimatedTime: 12
            })

            // 実際のAPI呼び出し（generateArticleメソッドが存在する場合）
            const generationRequest = {
              topic_id: selectedTopic.id,
              topic_summary: selectedTopic.summary,
              coins: selectedTopic.coins,
              style: generationSettings.style,
              length: generationSettings.length,
              include_images: generationSettings.includeImages,
              seo_optimized: generationSettings.seoOptimized,
              tone: generationSettings.tone
            }

            setGenerationState({ 
              ...get().generationState, 
              progress: 40, 
              currentStep: 'Generating article content...',
              stage: 'writing',
              estimatedTime: 8
            })

            // TODO: 実際のAPIエンドポイントが利用可能になったら使用
            // const response = await apiClient.generateArticle(generationRequest)
            
            // フォールバック: モック生成
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            setGenerationState({ 
              ...get().generationState, 
              progress: 80, 
              currentStep: 'Optimizing content structure...',
              stage: 'optimizing',
              estimatedTime: 3
            })

            await new Promise(resolve => setTimeout(resolve, 1000))

            const generatedArticle: Article = {
              id: `article-${Date.now()}`,
              topicId: selectedTopic.id,
              title: `${selectedTopic.summary} - 市場分析レポート`,
              content: generateMockContent(selectedTopic, generationSettings),
              status: 'draft',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {
                wordCount: 750,
                readingTime: 3,
                keywords: selectedTopic.coins,
                seoScore: 88,
                sentiment: generationSettings.tone,
                language: 'ja',
                updatedAt: new Date().toISOString()
              }
            }

            setCurrentArticle(generatedArticle)
            setGenerationState({
              isGenerating: false,
              progress: 100,
              currentStep: 'Article generation completed!',
              stage: 'completed',
              startedAt: null,
              error: null,
              estimatedTime: 0
            })

          } catch (apiError) {
            console.warn('API generation failed, using fallback:', apiError)
            
            // フォールバック生成
            setGenerationState({ 
              ...get().generationState, 
              progress: 60, 
              currentStep: 'Using fallback generation...',
              stage: 'writing',
              estimatedTime: 5
            })

            await new Promise(resolve => setTimeout(resolve, 1500))

            const fallbackArticle: Article = {
              id: `article-${Date.now()}`,
              topicId: selectedTopic.id,
              title: selectedTopic.summary,
              content: generateMockContent(selectedTopic, generationSettings),
              status: 'draft',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {
                wordCount: 650,
                readingTime: 3,
                keywords: selectedTopic.coins,
                seoScore: 82,
                sentiment: generationSettings.tone,
                language: 'ja',
                updatedAt: new Date().toISOString()
              }
            }

            setCurrentArticle(fallbackArticle)
            setGenerationState({
              isGenerating: false,
              progress: 100,
              currentStep: 'Generation complete (fallback mode)',
              stage: 'completed',
              startedAt: null,
              error: null,
              estimatedTime: 0
            })
          }

        } catch (error) {
          setGenerationState({
            isGenerating: false,
            progress: 0,
            currentStep: '',
            stage: 'error',
            startedAt: null,
            error: error instanceof Error ? error.message : 'Generation failed',
            estimatedTime: undefined
          })
        }
      },

      // 記事内容更新
      updateArticleContent: (content) => {
        const { currentArticle } = get()
        if (currentArticle) {
          const updatedArticle: Article = {
            ...currentArticle,
            content,
            metadata: {
              ...currentArticle.metadata,
              wordCount: content.split(/\s+/).length,
              readingTime: Math.ceil(content.split(/\s+/).length / 200),
              updatedAt: new Date().toISOString()
            }
          }
          set(
            { currentArticle: updatedArticle },
            false,
            'updateArticleContent'
          )
        }
      },

      // 記事保存
      saveArticle: async () => {
        const { currentArticle } = get()
        if (currentArticle) {
          try {
            // 実際のAPI呼び出し
            console.log('Saving article:', currentArticle.id)
            // await api.saveArticle(currentArticle)
          } catch (error) {
            console.error('Failed to save article:', error)
          }
        }
      },

      // ワークスペースリセット
      resetWorkspace: () => {
        set(
          {
            selectedTopic: null,
            currentArticle: null,
            generationState: { ...initialGenerationState },
            activeColumn: 'topics',
            topicFilter: 'all'
          },
          false,
          'resetWorkspace'
        )
      }
    }),
    {
      name: 'neural-workspace-store'
    }
  )
)

// 便利なセレクター
export const useSelectedTopic = () => useWorkspaceStore((state) => state.selectedTopic)
export const useCurrentArticle = () => useWorkspaceStore((state) => state.currentArticle)
export const useGenerationState = () => useWorkspaceStore((state) => state.generationState)
export const useActiveColumn = () => useWorkspaceStore((state) => state.activeColumn)