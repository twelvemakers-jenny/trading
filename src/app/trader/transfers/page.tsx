'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Modal } from '@/components/ui/modal'
import { DynamicForm } from '@/components/forms/dynamic-form'
import { useAuthStore } from '@/lib/store'
import { useTransfers, useAccounts, useInsert } from '@/lib/hooks/use-data'
import { formatUSD } from '@/lib/calculations'
import type { Transfer, Account, FieldDefinition } from '@/types/database'

export default function TraderTransfersPage() {
  const trader = useAuthStore((s) => s.trader)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { data: transfers = [], isLoading } = useTransfers(trader?.id)
  const { data: accounts = [] } = useAccounts(trader?.id)
  const insertTransfer = useInsert<Record<string, unknown>>('transfers', ['transfers'])

  const fields: FieldDefinition[] = [
    { key: 'account_id', label: '수취 계정', type: 'select', required: true,
      options: accounts.map((a) => `${a.id}::${a.alias} (${a.exchange})`) },
    { key: 'amount_usd', label: '이체 금액 (USD)', type: 'number', required: true },
    { key: 'purpose', label: '이체 목적', type: 'select', required: true,
      options: ['initial', 'additional', 'withdrawal', 'profit_withdrawal'] },
    { key: 'transfer_date', label: '이체 날짜', type: 'date', required: true },
    { key: 'memo', label: '메모', type: 'text', required: false },
  ]

  const handleSubmit = (values: Record<string, string>) => {
    insertTransfer.mutate(
      {
        trader_id: trader?.id,
        account_id: values.account_id.split('::')[0],
        amount_usd: parseFloat(values.amount_usd),
        purpose: values.purpose,
        transfer_date: values.transfer_date,
        memo: values.memo || null,
      },
      { onSuccess: () => setIsModalOpen(false) }
    )
  }

  const columns = [
    { key: 'transfer_date', header: '이체일' },
    { key: 'account_id', header: '수취 계정',
      render: (row: Transfer) => {
        const a = accounts.find((a: Account) => a.id === row.account_id)
        return a ? `${a.alias} (${a.exchange})` : '-'
      },
    },
    { key: 'amount_usd', header: '금액', align: 'right' as const,
      render: (row: Transfer) => formatUSD(row.amount_usd),
    },
    { key: 'purpose', header: '목적',
      render: (row: Transfer) => <StatusBadge status={row.purpose} />,
    },
    { key: 'status', header: '상태',
      render: (row: Transfer) => <StatusBadge status={row.status} />,
    },
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="내 이체 내역"
        description="거래소 계정으로 자금 이체"
        action={{ label: '이체 등록', onClick: () => setIsModalOpen(true) }}
      />
      <DataTable columns={columns} data={transfers} isLoading={isLoading} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="이체 등록">
        <DynamicForm fields={fields} onSubmit={handleSubmit} submitLabel="등록" isLoading={insertTransfer.isPending} />
      </Modal>
    </DashboardLayout>
  )
}
