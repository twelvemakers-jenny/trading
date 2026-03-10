'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Modal } from '@/components/ui/modal'
import { DynamicForm } from '@/components/forms/dynamic-form'
import { useAuthStore } from '@/lib/store'
import { usePositions, useAccounts, useInsert, useUpdate } from '@/lib/hooks/use-data'
import { formatUSD } from '@/lib/calculations'
import type { Position, Account, FieldDefinition } from '@/types/database'

const leverages = ['10x', '20x', '25x', '30x', '35x', '40x', '45x', '50x']

export default function TraderPositionsPage() {
  const trader = useAuthStore((s) => s.trader)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Position | null>(null)
  const { data: positions = [], isLoading } = usePositions(trader?.id)
  const { data: accounts = [] } = useAccounts(trader?.id)
  const insertPosition = useInsert<Record<string, unknown>>('positions', ['positions'])
  const updatePosition = useUpdate<Record<string, unknown>>('positions', ['positions'])

  const newFields: FieldDefinition[] = [
    { key: 'account_id', label: '계정', type: 'select', required: true,
      options: accounts.map((a) => `${a.id}::${a.alias} (${a.exchange})`) },
    { key: 'deposit_usd', label: '예치금 (USD)', type: 'number', required: true },
    { key: 'direction', label: '방향', type: 'select', required: true, options: ['long', 'short'] },
    { key: 'leverage', label: '레버리지', type: 'select', required: true, options: leverages },
    { key: 'entry_date', label: '진입 날짜', type: 'date', required: false },
    { key: 'issue_note', label: '이슈 / 특이점', type: 'text', required: false },
  ]

  const editFields: FieldDefinition[] = [
    { key: 'closing_balance_usd', label: '종료 잔액 (USD)', type: 'number', required: false },
    { key: 'exit_date', label: '종료 날짜', type: 'date', required: false },
    { key: 'status', label: '상태', type: 'select', required: true, options: ['pending', 'active', 'closed'] },
    { key: 'issue_note', label: '이슈 / 특이점', type: 'text', required: false },
  ]

  const handleNew = (values: Record<string, string>) => {
    insertPosition.mutate(
      {
        trader_id: trader?.id,
        account_id: values.account_id.split('::')[0],
        deposit_usd: parseFloat(values.deposit_usd),
        direction: values.direction,
        leverage: values.leverage,
        entry_date: values.entry_date || null,
        status: 'active',
        issue_note: values.issue_note || null,
      },
      { onSuccess: () => setIsModalOpen(false) }
    )
  }

  const handleEdit = (values: Record<string, string>) => {
    if (!editTarget) return
    updatePosition.mutate(
      {
        id: editTarget.id,
        closing_balance_usd: values.closing_balance_usd ? parseFloat(values.closing_balance_usd) : null,
        exit_date: values.exit_date || null,
        status: values.status,
        issue_note: values.issue_note || null,
      },
      { onSuccess: () => setEditTarget(null) }
    )
  }

  const columns = [
    { key: 'account_id', header: '계정',
      render: (row: Position) => {
        const a = accounts.find((a: Account) => a.id === row.account_id)
        return a ? `${a.alias} (${a.exchange})` : '-'
      },
    },
    { key: 'direction', header: '방향',
      render: (row: Position) => <StatusBadge status={row.direction} />,
    },
    { key: 'leverage', header: '레버리지' },
    { key: 'deposit_usd', header: '예치금', align: 'right' as const,
      render: (row: Position) => formatUSD(row.deposit_usd),
    },
    { key: 'pnl_usd', header: 'P&L', align: 'right' as const,
      render: (row: Position) => {
        if (!row.pnl_usd) return '-'
        const n = parseFloat(row.pnl_usd)
        return <span className={n >= 0 ? 'pnl-positive' : 'pnl-negative'}>{formatUSD(row.pnl_usd)}</span>
      },
    },
    { key: 'status', header: '상태',
      render: (row: Position) => <StatusBadge status={row.status} />,
    },
    { key: 'actions', header: '',
      render: (row: Position) => (
        <button
          onClick={() => setEditTarget(row)}
          className="text-xs text-accent hover:text-accent-hover"
        >
          수정
        </button>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="내 포지션"
        description="포지션 등록 및 수정"
        action={{ label: '포지션 추가', onClick: () => setIsModalOpen(true) }}
      />
      <DataTable columns={columns} data={positions} isLoading={isLoading} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="새 포지션">
        <DynamicForm fields={newFields} onSubmit={handleNew} submitLabel="등록" isLoading={insertPosition.isPending} />
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="포지션 수정">
        {editTarget && (
          <DynamicForm
            fields={editFields}
            initialValues={{
              closing_balance_usd: editTarget.closing_balance_usd ?? '',
              exit_date: editTarget.exit_date ?? '',
              status: editTarget.status,
              issue_note: editTarget.issue_note ?? '',
            }}
            onSubmit={handleEdit}
            submitLabel="수정"
            isLoading={updatePosition.isPending}
          />
        )}
      </Modal>
    </DashboardLayout>
  )
}
