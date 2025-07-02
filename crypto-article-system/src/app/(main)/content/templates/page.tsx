'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import {
  Sparkles,
  Edit,
  Eye,
  Plus,
  Search,
  Copy,
  Download,
  Upload,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

// Mock data - 実際の実装では Prisma から取得
interface Template {
  id: string
  name: string
  description: string
  category: string
  content: string
  variables: string[]
  usageCount: number
  lastUsedAt?: string
  isActive: boolean
  isSystem: boolean
  createdAt: string
}

const mockTemplates: Template[] = [
  {
    id: '1',
    name: '価格分析レポート',
    description: '仮想通貨の価格変動を分析する記事テンプレート',
    category: '分析',
    content: '# ${coin_name}価格分析：${date}\\n\\n## 現在の状況\\n${coin_name}は${time_period}で${price_change}%の変動を記録しました...\\n\\n## 市場要因\\n${market_factors}\\n\\n## 技術的分析\\n${technical_analysis}\\n\\n## 今後の見通し\\n${outlook}',
    variables: ['coin_name', 'date', 'time_period', 'price_change', 'market_factors', 'technical_analysis', 'outlook'],
    usageCount: 42,
    lastUsedAt: '2024-01-15T10:30:00Z',
    isActive: true,
    isSystem: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'マーケット速報',
    description: '緊急のマーケットニュースに対応する短文テンプレート',
    category: 'ニュース',
    content: '🚨 ${urgency_level}\\n\\n${headline}\\n\\n${summary}\\n\\n**影響を受ける銘柄：**\\n${affected_coins}\\n\\n**詳細：**\\n${details}\\n\\n---\\n*${timestamp}時点の情報*',
    variables: ['urgency_level', 'headline', 'summary', 'affected_coins', 'details', 'timestamp'],
    usageCount: 128,
    lastUsedAt: '2024-01-15T14:20:00Z',
    isActive: true,
    isSystem: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'プロジェクト紹介',
    description: '新しい仮想通貨プロジェクトを紹介する記事テンプレート',
    category: 'プロジェクト',
    content: '# ${project_name}とは？\\n\\n## プロジェクト概要\\n${project_overview}\\n\\n## 主な特徴\\n${key_features}\\n\\n## トークノミクス\\n- **トークン名：** ${token_name}\\n- **総供給量：** ${total_supply}\\n- **用途：** ${use_cases}\\n\\n## ロードマップ\\n${roadmap}\\n\\n## まとめ\\n${conclusion}',
    variables: ['project_name', 'project_overview', 'key_features', 'token_name', 'total_supply', 'use_cases', 'roadmap', 'conclusion'],
    usageCount: 23,
    lastUsedAt: '2024-01-14T16:45:00Z',
    isActive: true,
    isSystem: false,
    createdAt: '2024-01-05T00:00:00Z'
  },
  {
    id: '4',
    name: 'トレンド解説',
    description: 'マーケットトレンドを詳しく解説する記事テンプレート',
    category: 'トレンド',
    content: '# ${trend_title}\\n\\n## トレンドの背景\\n${background}\\n\\n## 主要な動き\\n${key_movements}\\n\\n## 投資家心理\\n${investor_sentiment}\\n\\n## 今後の展開予想\\n${future_outlook}\\n\\n## 注意点とリスク\\n${risks_warnings}',
    variables: ['trend_title', 'background', 'key_movements', 'investor_sentiment', 'future_outlook', 'risks_warnings'],
    usageCount: 67,
    lastUsedAt: '2024-01-15T09:15:00Z',
    isActive: true,
    isSystem: false,
    createdAt: '2024-01-03T00:00:00Z'
  },
  {
    id: '5',
    name: '週次レポート',
    description: '毎週のマーケット総括レポートテンプレート',
    category: 'レポート',
    content: '# 週次マーケットレポート（${week_dates}）\\n\\n## 今週のハイライト\\n${weekly_highlights}\\n\\n## 主要銘柄パフォーマンス\\n${top_performers}\\n\\n## 市場センチメント\\n${market_sentiment}\\n\\n## 来週の注目ポイント\\n${next_week_focus}',
    variables: ['week_dates', 'weekly_highlights', 'top_performers', 'market_sentiment', 'next_week_focus'],
    usageCount: 15,
    lastUsedAt: '2024-01-14T18:00:00Z',
    isActive: false,
    isSystem: false,
    createdAt: '2024-01-07T00:00:00Z'
  }
]

const columnHelper = createColumnHelper<Template>()

export default function TemplatesManagementPage() {
  const router = useRouter()
  const [data] = useState(mockTemplates)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  // const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  const getCategoryBadge = (category: string) => {
    const configs = {
      '分析': { className: 'bg-neural-cyan/20 text-neural-cyan border-neural-cyan/30' },
      'ニュース': { className: 'bg-neural-warning/20 text-neural-warning border-neural-warning/30' },
      'プロジェクト': { className: 'bg-neural-success/20 text-neural-success border-neural-success/30' },
      'トレンド': { className: 'bg-neural-orchid/20 text-neural-orchid border-neural-orchid/30' },
      'レポート': { className: 'bg-neural-error/20 text-neural-error border-neural-error/30' }
    }
    const config = configs[category as keyof typeof configs] || { className: 'bg-neural-surface text-neural-text-secondary' }
    return <Badge className={cn("text-xs border", config.className)}>{category}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-medium text-left"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          テンプレート名
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="font-medium neural-title text-sm">
              {row.original.name}
            </div>
            {row.original.isSystem && (
              <Star className="h-3 w-3 text-neural-warning fill-current" />
            )}
            {!row.original.isActive && (
              <Badge variant="outline" className="text-xs">
                無効
              </Badge>
            )}
          </div>
          <div className="text-xs text-neural-text-muted line-clamp-1 max-w-md">
            {row.original.description}
          </div>
          <div className="flex items-center gap-1">
            {getCategoryBadge(row.original.category)}
            <Badge variant="outline" className="text-xs">
              {row.original.variables.length} 変数
            </Badge>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('usageCount', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          使用実績
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <div className="font-medium neural-title text-lg">
            {row.original.usageCount}
          </div>
          <div className="text-xs text-neural-text-muted">
            {row.original.lastUsedAt ? formatDate(row.original.lastUsedAt) : '未使用'}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          作成日
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="text-sm neural-title">
          {formatDate(row.original.createdAt)}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'アクション',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <NeuralButton
            variant="ghost"
            size="sm"
            onClick={() => handleAction('view', row.original)}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-3 w-3" />
          </NeuralButton>
          <NeuralButton
            variant="ghost"
            size="sm"
            onClick={() => handleAction('edit', row.original)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-3 w-3" />
          </NeuralButton>
          <NeuralButton
            variant="ghost"
            size="sm"
            onClick={() => handleAction('use', row.original)}
            className="h-8 w-8 p-0"
          >
            <Sparkles className="h-3 w-3" />
          </NeuralButton>
          <NeuralButton
            variant="ghost"
            size="sm"
            onClick={() => handleAction('copy', row.original)}
            className="h-8 w-8 p-0"
          >
            <Copy className="h-3 w-3" />
          </NeuralButton>
        </div>
      ),
    }),
  ], [handleAction])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const handleAction = useCallback((action: string, template: Template) => {
    switch (action) {
      case 'view':
        setSelectedTemplate(template)
        break
      case 'edit':
        router.push(`/content/templates/${template.id}/edit`)
        break
      case 'use':
        const params = new URLSearchParams({
          template: template.id,
          source: 'template'
        })
        router.push(`/content/workspace?${params.toString()}`)
        toast.success(`テンプレート「${template.name}」で記事生成を開始します`)
        break
      case 'copy':
        navigator.clipboard.writeText(template.content)
        toast.success('テンプレートをクリップボードにコピーしました')
        break
      case 'toggle':
        toast.success(`テンプレートを${template.isActive ? '無効' : '有効'}にしました`)
        break
      case 'delete':
        toast.success('テンプレートを削除しました')
        break
      default:
        toast.info(`${action} 機能は準備中です`)
    }
  }, [router])

  const handleCreateTemplate = () => {
    toast.info('新規テンプレート作成機能は準備中です')
  }

  const categoryFilters = ['すべて', '分析', 'ニュース', 'プロジェクト', 'トレンド', 'レポート']

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold neural-title neural-glow-text mb-2">
          テンプレート管理
        </h1>
        <p className="text-neural-text-secondary">
          記事テンプレートの作成、編集、管理
        </p>
      </div>

      <NeuralCard>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-neural-warning" />
              テンプレート一覧
            </CardTitle>
            <div className="flex items-center gap-2">
              <NeuralButton
                variant="ghost"
                size="sm"
                onClick={() => toast.info('インポート機能は準備中です')}
              >
                <Upload className="h-4 w-4 mr-2" />
                インポート
              </NeuralButton>
              <NeuralButton
                variant="ghost"
                size="sm"
                onClick={() => toast.info('エクスポート機能は準備中です')}
              >
                <Download className="h-4 w-4 mr-2" />
                エクスポート
              </NeuralButton>
              <NeuralButton
                variant="gradient"
                onClick={handleCreateTemplate}
              >
                <Plus className="h-4 w-4 mr-2" />
                新しいテンプレート
              </NeuralButton>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neural-text-muted" />
              <Input
                placeholder="テンプレートを検索..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 neural-input"
              />
            </div>
            <select
              className="px-3 py-2 rounded-lg bg-neural-surface border border-neural-elevated text-neural-text-primary"
              onChange={(e) => {
                const value = e.target.value === 'すべて' ? '' : e.target.value
                table.getColumn('category')?.setFilterValue(value || undefined)
              }}
            >
              {categoryFilters.map((filter) => (
                <option key={filter} value={filter}>
                  {filter}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="neural-neumorphic-inset rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-neural-elevated/30">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-left text-sm font-medium neural-title"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-neural-elevated/20 hover:bg-neural-elevated/10 neural-transition"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-neural-text-secondary">
              {table.getFilteredRowModel().rows.length} 件中{' '}
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} -{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{' '}
              件を表示
            </div>
            <div className="flex items-center gap-2">
              <NeuralButton
                variant="ghost"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </NeuralButton>
              <span className="text-sm neural-title">
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
              <NeuralButton
                variant="ghost"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </NeuralButton>
            </div>
          </div>
        </CardContent>
      </NeuralCard>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 bg-neural-void/80 backdrop-blur-sm flex items-center justify-center p-4">
          <NeuralCard className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-neural-cyan" />
                    {selectedTemplate.name}
                  </CardTitle>
                  <p className="text-neural-text-secondary text-sm mt-1">
                    {selectedTemplate.description}
                  </p>
                </div>
                <NeuralButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTemplate(null)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </NeuralButton>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium neural-title mb-2">変数一覧</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate.variables.map((variable) => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        ${`{${variable}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium neural-title mb-2">統計</h4>
                  <div className="space-y-1 text-sm">
                    <div>使用回数: {selectedTemplate.usageCount}</div>
                    <div>最終使用: {selectedTemplate.lastUsedAt ? formatDate(selectedTemplate.lastUsedAt) : '未使用'}</div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium neural-title mb-2">テンプレート内容</h4>
                <div className="neural-neumorphic-inset p-4 rounded-lg overflow-auto max-h-60">
                  <pre className="text-sm text-neural-text-primary whitespace-pre-wrap">
                    {selectedTemplate.content}
                  </pre>
                </div>
              </div>
              <div className="flex gap-2">
                <NeuralButton
                  variant="gradient"
                  onClick={() => handleAction('use', selectedTemplate)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  このテンプレートを使用
                </NeuralButton>
                <NeuralButton
                  variant="ghost"
                  onClick={() => handleAction('copy', selectedTemplate)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  コピー
                </NeuralButton>
                <NeuralButton
                  variant="ghost"
                  onClick={() => handleAction('edit', selectedTemplate)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  編集
                </NeuralButton>
              </div>
            </CardContent>
          </NeuralCard>
        </div>
      )}
    </div>
  )
}