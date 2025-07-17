'use client'

// 動的レンダリングを強制（プリレンダリングエラー回避）
export const dynamic = 'force-dynamic'

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
  FileText,
  Edit,
  Eye,
  Plus,
  Search,
  Download,
  BarChart3,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

// Mock data - 実際の実装では Prisma から取得
interface Article {
  id: string
  title: string
  status: 'DRAFT' | 'REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED'
  sourceType: 'MANUAL' | 'MARKET' | 'ALERT' | 'NEWS' | 'TEMPLATE'
  viewCount: number
  engagementRate: number
  createdAt: string
  publishedAt?: string
  tags: string[]
  author: string
}

const mockArticles: Article[] = [
  {
    id: '1',
    title: 'ビットコイン価格急騰：機関投資家の買いが活発化',
    status: 'PUBLISHED',
    sourceType: 'MARKET',
    viewCount: 15420,
    engagementRate: 12.8,
    createdAt: '2024-01-15T10:30:00Z',
    publishedAt: '2024-01-15T11:00:00Z',
    tags: ['Bitcoin', 'Price Analysis', 'Institutional'],
    author: 'AI Generator'
  },
  {
    id: '2',
    title: 'イーサリアムDeFiエコシステムの最新動向分析',
    status: 'PUBLISHED',
    sourceType: 'NEWS',
    viewCount: 8940,
    engagementRate: 9.2,
    createdAt: '2024-01-15T08:15:00Z',
    publishedAt: '2024-01-15T09:00:00Z',
    tags: ['Ethereum', 'DeFi', 'Ecosystem'],
    author: 'AI Generator'
  },
  {
    id: '3',
    title: 'Solana新プロジェクト発表の市場への影響',
    status: 'REVIEW',
    sourceType: 'ALERT',
    viewCount: 0,
    engagementRate: 0,
    createdAt: '2024-01-15T14:20:00Z',
    tags: ['Solana', 'Project Launch', 'Market Impact'],
    author: 'AI Generator'
  },
  {
    id: '4',
    title: 'レイヤー2ソリューション比較分析レポート',
    status: 'DRAFT',
    sourceType: 'TEMPLATE',
    viewCount: 0,
    engagementRate: 0,
    createdAt: '2024-01-15T16:45:00Z',
    tags: ['Layer2', 'Comparison', 'Technical Analysis'],
    author: 'Manual'
  },
  {
    id: '5',
    title: '規制環境の明確化が仮想通貨市場に与える影響',
    status: 'SCHEDULED',
    sourceType: 'MANUAL',
    viewCount: 0,
    engagementRate: 0,
    createdAt: '2024-01-15T12:00:00Z',
    publishedAt: '2024-01-16T09:00:00Z',
    tags: ['Regulation', 'Market Analysis', 'Policy'],
    author: 'Manual'
  }
]

const columnHelper = createColumnHelper<Article>()

export default function ArticlesManagementPage() {
  const router = useRouter()
  const [data] = useState(mockArticles)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const getStatusBadge = (status: string) => {
    const configs = {
      DRAFT: { label: '下書き', className: 'bg-neural-warning/20 text-neural-warning border-neural-warning/30' },
      REVIEW: { label: 'レビュー中', className: 'bg-neural-cyan/20 text-neural-cyan border-neural-cyan/30' },
      SCHEDULED: { label: '予約投稿', className: 'bg-neural-orchid/20 text-neural-orchid border-neural-orchid/30' },
      PUBLISHED: { label: '公開済み', className: 'bg-neural-success/20 text-neural-success border-neural-success/30' },
      ARCHIVED: { label: 'アーカイブ', className: 'bg-neural-text-muted/20 text-neural-text-muted border-neural-text-muted/30' }
    }
    const config = configs[status as keyof typeof configs] || configs.DRAFT
    return <Badge className={cn("text-xs border", config.className)}>{config.label}</Badge>
  }

  const getSourceBadge = (sourceType: string) => {
    const configs = {
      MANUAL: { label: '手動', className: 'bg-neural-surface text-neural-text-secondary' },
      MARKET: { label: 'マーケット', className: 'bg-neural-cyan/20 text-neural-cyan' },
      ALERT: { label: 'アラート', className: 'bg-neural-warning/20 text-neural-warning' },
      NEWS: { label: 'ニュース', className: 'bg-neural-orchid/20 text-neural-orchid' },
      TEMPLATE: { label: 'テンプレート', className: 'bg-neural-success/20 text-neural-success' }
    }
    const config = configs[sourceType as keyof typeof configs] || configs.MANUAL
    return <Badge variant="outline" className={cn("text-xs", config.className)}>{config.label}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleAction = useCallback((action: string, articleId: string) => {
    switch (action) {
      case 'view':
        router.push(`/content/articles/${articleId}`)
        break
      case 'edit':
        router.push(`/content/workspace?edit=${articleId}`)
        break
      case 'analytics':
        router.push(`/analytics/performance?article=${articleId}`)
        break
      case 'duplicate':
        toast.success('記事を複製しました')
        break
      case 'delete':
        toast.success('記事を削除しました')
        break
      default:
        toast.info(`${action} 機能は準備中です`)
    }
  }, [router])

  const columns = useMemo(() => [
    columnHelper.accessor('title', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-medium text-left"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          タイトル
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium neural-title text-sm line-clamp-2 max-w-md">
            {row.original.title}
          </div>
          <div className="flex items-center gap-1">
            {getSourceBadge(row.original.sourceType)}
            <div className="flex gap-1">
              {row.original.tags.slice(0, 2).map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {row.original.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{row.original.tags.length - 2}
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'ステータス',
      cell: ({ row }) => getStatusBadge(row.original.status),
      filterFn: 'equals',
    }),
    columnHelper.accessor('viewCount', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          PV数
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <div className="font-medium neural-title">
            {row.original.viewCount.toLocaleString()}
          </div>
          <div className="text-xs text-neural-text-muted">
            {row.original.engagementRate.toFixed(1)}% エンゲージメント
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
        <div className="text-sm">
          <div className="neural-title">{formatDate(row.original.createdAt)}</div>
          {row.original.publishedAt && (
            <div className="text-xs text-neural-text-muted">
              公開: {formatDate(row.original.publishedAt)}
            </div>
          )}
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
            onClick={() => handleAction('view', row.original.id)}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-3 w-3" />
          </NeuralButton>
          <NeuralButton
            variant="ghost"
            size="sm"
            onClick={() => handleAction('edit', row.original.id)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-3 w-3" />
          </NeuralButton>
          <NeuralButton
            variant="ghost"
            size="sm"
            onClick={() => handleAction('analytics', row.original.id)}
            className="h-8 w-8 p-0"
          >
            <BarChart3 className="h-3 w-3" />
          </NeuralButton>
          <NeuralButton
            variant="ghost"
            size="sm"
            onClick={() => handleAction('more', row.original.id)}
            className="h-8 w-8 p-0"
          >
            <MoreHorizontal className="h-3 w-3" />
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

  const handleNewArticle = () => {
    router.push('/content/workspace')
  }

  const statusFilters = [
    { value: '', label: 'すべて' },
    { value: 'DRAFT', label: '下書き' },
    { value: 'REVIEW', label: 'レビュー中' },
    { value: 'SCHEDULED', label: '予約投稿' },
    { value: 'PUBLISHED', label: '公開済み' },
    { value: 'ARCHIVED', label: 'アーカイブ' }
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold neural-title neural-glow-text mb-2">
          記事管理
        </h1>
        <p className="text-neural-text-secondary">
          生成された記事の管理、編集、パフォーマンス分析
        </p>
      </div>

      <NeuralCard>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-neural-cyan" />
              記事一覧
            </CardTitle>
            <div className="flex items-center gap-2">
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
                onClick={handleNewArticle}
              >
                <Plus className="h-4 w-4 mr-2" />
                新しい記事
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
                placeholder="記事を検索..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 neural-input"
              />
            </div>
            <select
              value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value || undefined)}
              className="px-3 py-2 rounded-lg bg-neural-surface border border-neural-elevated text-neural-text-primary"
            >
              {statusFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
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
    </div>
  )
}