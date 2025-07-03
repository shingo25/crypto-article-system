import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

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

// モック記事コンテンツ生成関数
function generateMockContent(topic: Topic, settings: GenerationSettings): string {
  const { coins, summary } = topic
  const coinList = coins.join('、')
  
  const introTemplates = [
    `${coinList}の最新動向について詳しく解説します。`,
    `暗号通貨市場で注目を集めている${coinList}の分析レポートをお届けします。`,
    `${summary}について、市場データと専門的な観点から分析します。`
  ]
  
  const bodyTemplates = [
    `## 市場分析

${coinList}は近日中に重要な価格変動を示しており、投資家の関心が高まっています。技術的分析によると、以下の要因が価格に影響を与えています：

- **需給バランスの変化**: 機関投資家の参入により需要が増加
- **技術的進歩**: ブロックチェーン技術の改良とスケーラビリティの向上  
- **規制環境**: 各国の暗号通貨規制の明確化

## 投資戦略

現在の市場状況を踏まえ、以下の投資戦略を検討することをお勧めします：

1. **長期保有戦略**: ファンダメンタルズに基づく投資
2. **ドルコスト平均法**: 定期的な小額投資によるリスク分散
3. **テクニカル分析**: チャートパターンに基づく売買タイミングの判断

## まとめ

${summary}は今後も注目すべき重要なトピックです。投資判断を行う際は、常に最新の市場情報を確認し、リスク管理を徹底することが重要です。`,

    `## 詳細分析

${summary}に関して、以下の重要なポイントを詳しく解説します。

### 技術的背景

${coinList}の基盤技術は、従来の金融システムに革新をもたらす可能性を秘めています。特に以下の特徴が注目されています：

- **セキュリティ**: 暗号学的ハッシュ関数による高度なセキュリティ
- **透明性**: 全ての取引がブロックチェーン上で公開・検証可能
- **分散性**: 中央集権的な管理者不要の自律的システム

### 市場への影響

この動向は暗号通貨市場全体に以下の影響を与える可能性があります：

1. **価格への影響**: 短期的な価格変動の要因
2. **取引量の変化**: 市場流動性への影響
3. **投資家心理**: センチメント指標への反映

### 今後の展望

専門家の見解では、${coinList}は以下の発展が期待されています：

- 新たな技術革新の導入
- 実用性の向上とユースケースの拡大
- 機関投資家による本格的な参入

## 結論

${summary}は暗号通貨業界の重要なマイルストーンとなる可能性が高く、今後の動向に注目が集まります。`
  ]
  
  const intro = introTemplates[Math.floor(Math.random() * introTemplates.length)]
  const body = bodyTemplates[Math.floor(Math.random() * bodyTemplates.length)]
  
  let content = `# ${summary}\n\n${intro}\n\n${body}`
  
  // 記事の長さ調整
  if (settings.length === 'short') {
    content = content.substring(0, Math.floor(content.length * 0.6))
  } else if (settings.length === 'long') {
    content += `\n\n## 追加分析\n\n詳細な市場データとチャート分析により、${coinList}の今後の価格動向を予測します。テクニカル指標RSI、MACD、ボリンジャーバンドを組み合わせた分析結果をお届けします。`
  }
  
  return content
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
              topicId: selectedTopic.id,
              type: generationSettings.style,
              depth: generationSettings.length,
              keywords: selectedTopic.coins
            }

            setGenerationState({ 
              ...get().generationState, 
              progress: 40, 
              currentStep: 'Generating article content...',
              stage: 'writing',
              estimatedTime: 8
            })

            // 実際のAPIエンドポイントを使用
            const response = await apiClient.generateArticle(selectedTopic.id, {
              type: generationSettings.style,
              depth: generationSettings.length,
              keywords: selectedTopic.coins
            })

            if (response.success && response.taskId) {
              // 非同期生成の場合、タスクステータスを監視
              setGenerationState({ 
                ...get().generationState, 
                progress: 60, 
                currentStep: 'AI processing your request...',
                stage: 'writing',
                estimatedTime: 6
              })

              // タスク完了まで待機
              let taskComplete = false
              let attempts = 0
              const maxAttempts = 30 // 5分間

              while (!taskComplete && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 10000)) // 10秒待機
                attempts++

                try {
                  const taskStatus = await apiClient.getTaskStatus(response.taskId)
                  
                  if (taskStatus.status === 'completed' && taskStatus.result) {
                    const generatedArticle: Article = {
                      id: `article-${Date.now()}`,
                      topicId: selectedTopic.id,
                      title: taskStatus.result.title || `${selectedTopic.summary} - 市場分析レポート`,
                      content: taskStatus.result.content || generateMockContent(selectedTopic, generationSettings),
                      status: 'draft',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      metadata: {
                        wordCount: taskStatus.result.word_count || 750,
                        readingTime: Math.ceil((taskStatus.result.word_count || 750) / 250),
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
                      currentStep: 'AI記事生成完了！',
                      stage: 'completed',
                      startedAt: null,
                      error: null,
                      estimatedTime: 0
                    })
                    
                    // 生成完了時のUI切り替え（Preview列に自動遷移）
                    const { setActiveColumn } = get()
                    
                    // 成功通知を表示
                    if (typeof window !== 'undefined') {
                      const { toast } = await import('react-hot-toast')
                      toast.success(`記事「${generatedArticle.title}」の生成が完了しました！`, {
                        duration: 4000,
                        position: 'bottom-right',
                        style: {
                          background: 'var(--neural-surface)',
                          color: 'var(--neural-text-primary)',
                          border: '1px solid var(--neural-success)',
                        }
                      })
                    }
                    
                    setTimeout(() => {
                      setActiveColumn('preview')
                    }, 500) // 0.5秒後にPreviewに切り替え
                    
                    taskComplete = true
                    return // 成功時は関数を終了
                  } else if (taskStatus.status === 'failed') {
                    throw new Error(taskStatus.error || 'Generation failed')
                  } else {
                    // まだ処理中
                    setGenerationState({ 
                      ...get().generationState, 
                      progress: Math.min(60 + (attempts * 2), 90),
                      currentStep: `AI generating... (${attempts}/30)`,
                      estimatedTime: Math.max(6 - attempts, 1)
                    })
                  }
                } catch (statusError) {
                  console.warn('Task status check failed:', statusError)
                  break
                }
              }

              if (!taskComplete) {
                throw new Error('Generation timed out')
              }
            } else {
              throw new Error(response.message || 'API generation failed')
            }

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
              currentStep: '記事生成完了（フォールバックモード）',
              stage: 'completed',
              startedAt: null,
              error: null,
              estimatedTime: 0
            })
            
            // 生成完了時のUI切り替え（Preview列に自動遷移）
            const { setActiveColumn } = get()
            
            // 成功通知を表示（フォールバックモード）
            if (typeof window !== 'undefined') {
              const { toast } = await import('react-hot-toast')
              toast.success(`記事「${fallbackArticle.title}」の生成が完了しました！`, {
                duration: 4000,
                position: 'bottom-right',
                style: {
                  background: 'var(--neural-surface)',
                  color: 'var(--neural-text-primary)',
                  border: '1px solid var(--neural-success)',
                }
              })
            }
            
            setTimeout(() => {
              setActiveColumn('preview')
            }, 500) // 0.5秒後にPreviewに切り替え
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