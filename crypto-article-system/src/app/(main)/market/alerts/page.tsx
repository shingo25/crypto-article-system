'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  AlertTriangle,
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  Bell,
  BellOff,
  Edit,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Percent,
  Target,
  Sparkles,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface PriceAlert {
  id: string
  coinSymbol: string
  coinName: string
  alertType: 'above' | 'below' | 'change_percent'
  targetValue: number
  currentPrice: number
  isActive: boolean
  isTriggered: boolean
  triggeredAt?: string
  createdAt: string
  lastCheckedAt: string
  autoGenerateArticle: boolean
  description?: string
}

const mockAlerts: PriceAlert[] = [
  {
    id: '1',
    coinSymbol: 'BTC',
    coinName: 'Bitcoin',
    alertType: 'above',
    targetValue: 50000,
    currentPrice: 45000,
    isActive: true,
    isTriggered: false,
    createdAt: '2024-01-10T00:00:00Z',
    lastCheckedAt: '2024-01-15T15:00:00Z',
    autoGenerateArticle: true,
    description: 'ビットコイン5万ドル突破アラート'
  },
  {
    id: '2',
    coinSymbol: 'ETH',
    coinName: 'Ethereum',
    alertType: 'below',
    targetValue: 2000,
    currentPrice: 2500,
    isActive: true,
    isTriggered: false,
    createdAt: '2024-01-12T00:00:00Z',
    lastCheckedAt: '2024-01-15T15:00:00Z',
    autoGenerateArticle: false,
    description: 'イーサリアム下落警告'
  },
  {
    id: '3',
    coinSymbol: 'SOL',
    coinName: 'Solana',
    alertType: 'change_percent',
    targetValue: 10,
    currentPrice: 100,
    isActive: true,
    isTriggered: true,
    triggeredAt: '2024-01-15T12:30:00Z',
    createdAt: '2024-01-08T00:00:00Z',
    lastCheckedAt: '2024-01-15T15:00:00Z',
    autoGenerateArticle: true,
    description: 'Solana 10%変動アラート'
  },
  {
    id: '4',
    coinSymbol: 'ADA',
    coinName: 'Cardano',
    alertType: 'above',
    targetValue: 1.5,
    currentPrice: 1.2,
    isActive: false,
    isTriggered: false,
    createdAt: '2024-01-05T00:00:00Z',
    lastCheckedAt: '2024-01-14T10:00:00Z',
    autoGenerateArticle: false,
    description: 'カルダノ1.5ドルレジスタンス突破'
  }
]

const columnHelper = createColumnHelper<PriceAlert>()

export default function PriceAlertsPage() {
  const router = useRouter()
  const [data] = useState(mockAlerts)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newAlert, setNewAlert] = useState({
    coinSymbol: '',
    coinName: '',
    alertType: 'above' as 'above' | 'below' | 'change_percent',
    targetValue: '',
    autoGenerateArticle: true,
    description: ''
  })

  const getAlertTypeBadge = (type: string) => {
    const configs = {
      'above': { 
        icon: TrendingUp, 
        className: 'bg-neural-success/20 text-neural-success border-neural-success/30',
        label: '上昇'
      },
      'below': { 
        icon: TrendingDown, 
        className: 'bg-neural-error/20 text-neural-error border-neural-error/30',
        label: '下落'
      },
      'change_percent': { 
        icon: Percent, 
        className: 'bg-neural-cyan/20 text-neural-cyan border-neural-cyan/30',
        label: '変動率'
      }
    }
    const config = configs[type as keyof typeof configs]
    const IconComponent = config.icon
    
    return (
      <Badge className={cn("text-xs border flex items-center gap-1", config.className)}>
        <IconComponent className="h-2 w-2" />
        {config.label}
      </Badge>
    )
  }

  const getStatusBadge = (alert: PriceAlert) => {
    if (alert.isTriggered) {
      return <Badge className="bg-neural-warning/20 text-neural-warning border-neural-warning/30">発火済み</Badge>
    }
    if (!alert.isActive) {
      return <Badge variant="outline">無効</Badge>
    }
    return <Badge className="bg-neural-success/20 text-neural-success border-neural-success/30">監視中</Badge>
  }

  const formatValue = (alert: PriceAlert) => {
    if (alert.alertType === 'change_percent') {
      return `${alert.targetValue}%`
    }
    return `$${alert.targetValue.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const columns = useMemo(() => [
    columnHelper.accessor('coinSymbol', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-medium text-left"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          通貨
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="font-bold neural-title text-sm">
              {row.original.coinSymbol}
            </div>
            <div className="text-xs text-neural-text-muted">
              {row.original.coinName}
            </div>
          </div>
          <div className="text-xs font-medium neural-title">
            ${row.original.currentPrice.toLocaleString()}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('alertType', {
      header: 'アラート条件',
      cell: ({ row }) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {getAlertTypeBadge(row.original.alertType)}
            <span className="text-sm font-medium neural-title">
              {formatValue(row.original)}
            </span>
          </div>
          {row.original.description && (
            <div className="text-xs text-neural-text-muted line-clamp-1">
              {row.original.description}
            </div>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('isActive', {
      header: 'ステータス',
      cell: ({ row }) => (
        <div className="space-y-1">
          {getStatusBadge(row.original)}
          {row.original.autoGenerateArticle && (
            <div className="flex items-center gap-1">
              <Sparkles className="h-2 w-2 text-neural-warning" />
              <span className="text-xs text-neural-text-muted">自動生成</span>
            </div>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          作成日時
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="text-sm neural-title">
            {formatDate(row.original.createdAt)}
          </div>
          {row.original.triggeredAt && (
            <div className="text-xs text-neural-warning">
              発火: {formatDate(row.original.triggeredAt)}
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
            onClick={() => handleAction('toggle', row.original)}
            className="h-8 w-8 p-0"
            title={row.original.isActive ? 'アラートを無効化' : 'アラートを有効化'}
          >
            {row.original.isActive ? 
              <Bell className="h-3 w-3 text-neural-success" /> : 
              <BellOff className="h-3 w-3 text-neural-text-muted" />
            }
          </NeuralButton>
          <NeuralButton
            variant="ghost"
            size="sm"
            onClick={() => handleAction('edit', row.original)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-3 w-3" />
          </NeuralButton>
          {row.original.isTriggered && row.original.autoGenerateArticle && (
            <NeuralButton
              variant="ghost"
              size="sm"
              onClick={() => handleAction('generate', row.original)}
              className="h-8 w-8 p-0"
              title="記事を生成"
            >
              <Sparkles className="h-3 w-3 text-neural-warning" />
            </NeuralButton>
          )}
          <NeuralButton
            variant="ghost"
            size="sm"
            onClick={() => handleAction('delete', row.original)}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-3 w-3 text-neural-error" />
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

  const handleAction = useCallback((action: string, alert: PriceAlert) => {
    switch (action) {
      case 'toggle':
        toast.success(`アラートを${alert.isActive ? '無効' : '有効'}にしました`)
        break
      case 'edit':
        toast.info('編集機能は準備中です')
        break
      case 'generate':
        const params = new URLSearchParams({
          topic: `${alert.coinName} 価格アラート発火`,
          source: 'alert',
          alertId: alert.id,
          coinSymbol: alert.coinSymbol
        })
        router.push(`/content/workspace?${params.toString()}`)
        toast.success(`${alert.coinName}のアラート記事を生成します`)
        break
      case 'delete':
        toast.success('アラートを削除しました')
        break
      default:
        toast.info(`${action} 機能は準備中です`)
    }
  }, [router])

  const handleCreateAlert = () => {
    // 入力値バリデーション
    if (!newAlert.coinSymbol.trim()) {
      toast.error('通貨シンボルを入力してください')
      return
    }

    if (!newAlert.targetValue.trim()) {
      toast.error('目標値を入力してください')
      return
    }

    const targetValue = parseFloat(newAlert.targetValue)
    
    // 数値バリデーション
    if (isNaN(targetValue) || targetValue <= 0) {
      toast.error('目標値は正の数値を入力してください')
      return
    }

    // 通貨シンボルのフォーマットチェック（英数字のみ、最大10文字）
    const symbolRegex = /^[A-Z0-9]{1,10}$/
    if (!symbolRegex.test(newAlert.coinSymbol)) {
      toast.error('通貨シンボルは英数字（大文字）1-10文字で入力してください')
      return
    }

    // 変動率の場合の範囲チェック
    if (newAlert.alertType === 'change_percent' && (targetValue > 1000 || targetValue < 0.1)) {
      toast.error('変動率は0.1%〜1000%の範囲で入力してください')
      return
    }

    // 価格の場合の範囲チェック
    if ((newAlert.alertType === 'above' || newAlert.alertType === 'below') && targetValue > 10000000) {
      toast.error('価格は1,000万以下で入力してください')
      return
    }

    // 説明文の長さチェック
    if (newAlert.description && newAlert.description.length > 200) {
      toast.error('説明は200文字以内で入力してください')
      return
    }

    // XSS対策：HTMLタグが含まれていないかチェック
    const hasHtmlTags = /<[^>]*>/g.test(newAlert.description || '') || /<[^>]*>/g.test(newAlert.coinName || '')
    if (hasHtmlTags) {
      toast.error('説明や通貨名にHTMLタグは使用できません')
      return
    }

    toast.success('価格アラートを作成しました')
    setShowCreateModal(false)
    setNewAlert({
      coinSymbol: '',
      coinName: '',
      alertType: 'above',
      targetValue: '',
      autoGenerateArticle: true,
      description: ''
    })
  }

  const activeAlerts = data.filter(alert => alert.isActive && !alert.isTriggered).length
  const triggeredAlerts = data.filter(alert => alert.isTriggered).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold neural-title neural-glow-text mb-2">
          価格アラート
        </h1>
        <p className="text-neural-text-secondary">
          暗号通貨の価格変動をリアルタイムで監視し、自動記事生成
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <NeuralCard>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 neural-neumorphic rounded-lg">
                <Bell className="h-5 w-5 text-neural-success" />
              </div>
              <div>
                <div className="text-2xl font-bold neural-title">{activeAlerts}</div>
                <div className="text-sm text-neural-text-secondary">監視中</div>
              </div>
            </div>
          </CardContent>
        </NeuralCard>

        <NeuralCard>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 neural-neumorphic rounded-lg">
                <AlertTriangle className="h-5 w-5 text-neural-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold neural-title">{triggeredAlerts}</div>
                <div className="text-sm text-neural-text-secondary">発火済み</div>
              </div>
            </div>
          </CardContent>
        </NeuralCard>

        <NeuralCard>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 neural-neumorphic rounded-lg">
                <Target className="h-5 w-5 text-neural-cyan" />
              </div>
              <div>
                <div className="text-2xl font-bold neural-title">{data.length}</div>
                <div className="text-sm text-neural-text-secondary">総アラート数</div>
              </div>
            </div>
          </CardContent>
        </NeuralCard>
      </div>

      <NeuralCard>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-neural-warning" />
              アラート一覧
            </CardTitle>
            <NeuralButton
              variant="gradient"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              新しいアラート
            </NeuralButton>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neural-text-muted" />
            <Input
              placeholder="通貨や説明で検索..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 neural-input"
            />
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

      {/* Create Alert Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-neural-void/80 backdrop-blur-sm flex items-center justify-center p-4">
          <NeuralCard className="w-full max-w-md">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-neural-cyan" />
                  新しい価格アラート
                </CardTitle>
                <NeuralButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </NeuralButton>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="coinSymbol">通貨シンボル</Label>
                <Input
                  id="coinSymbol"
                  placeholder="BTC, ETH, SOL..."
                  value={newAlert.coinSymbol}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, coinSymbol: e.target.value.toUpperCase() }))}
                  className="neural-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coinName">通貨名（任意）</Label>
                <Input
                  id="coinName"
                  placeholder="Bitcoin, Ethereum..."
                  value={newAlert.coinName}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, coinName: e.target.value }))}
                  className="neural-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alertType">アラートタイプ</Label>
                <select
                  id="alertType"
                  value={newAlert.alertType}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, alertType: e.target.value as 'above' | 'below' | 'change_percent' }))}
                  className="w-full px-3 py-2 rounded-lg bg-neural-surface border border-neural-elevated text-neural-text-primary"
                >
                  <option value="above">価格上昇</option>
                  <option value="below">価格下落</option>
                  <option value="change_percent">変動率</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetValue">
                  {newAlert.alertType === 'change_percent' ? '変動率 (%)' : '目標価格 ($)'}
                </Label>
                <Input
                  id="targetValue"
                  type="number"
                  placeholder={newAlert.alertType === 'change_percent' ? '10' : '50000'}
                  value={newAlert.targetValue}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, targetValue: e.target.value }))}
                  className="neural-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">説明（任意）</Label>
                <Input
                  id="description"
                  placeholder="アラートの説明"
                  value={newAlert.description}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, description: e.target.value }))}
                  className="neural-input"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoGenerate"
                  checked={newAlert.autoGenerateArticle}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, autoGenerateArticle: e.target.checked }))}
                  className="rounded border-neural-elevated"
                />
                <Label htmlFor="autoGenerate" className="text-sm">
                  アラート発火時に自動で記事を生成
                </Label>
              </div>

              <div className="flex gap-2 pt-4">
                <NeuralButton
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  キャンセル
                </NeuralButton>
                <NeuralButton
                  variant="gradient"
                  onClick={handleCreateAlert}
                  className="flex-1"
                >
                  作成
                </NeuralButton>
              </div>
            </CardContent>
          </NeuralCard>
        </div>
      )}
    </div>
  )
}