'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Modal } from '@/components/ui/modal'
import { DynamicForm } from '@/components/forms/dynamic-form'
import { useTraders, useInsert, useUpdate, useDelete } from '@/lib/hooks/use-data'
import type { Trader, FieldDefinition } from '@/types/database'

const createFields: FieldDefinition[] = [
  { key: 'email', label: '이메일', type: 'email', required: true },
  { key: 'password', label: '비밀번호', type: 'text', required: true },
  { key: 'name', label: '이름', type: 'text', required: true },
  { key: 'phone', label: '연락처', type: 'phone', required: false },
  { key: 'role', label: '역할', type: 'select', required: true, options: ['admin', 'head_trader', 'trader'] },
]

const coreFields: FieldDefinition[] = [
  { key: 'name', label: '트레이더명', type: 'text', required: true },
  { key: 'role', label: '역할', type: 'select', required: true, options: ['admin', 'head_trader', 'trader'] },
]

const statusFields: FieldDefinition[] = [
  { key: 'status', label: '상태', type: 'select', required: true, options: ['active', 'dormant', 'closed'] },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  head_trader: 'Head Trader',
  trader: 'Trader',
}

export default function TradersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Trader | null>(null)
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({})
  const { data: traders = [], isLoading } = useTraders()
  const insertTrader = useInsert<Record<string, unknown>>('traders', ['traders'])
  const updateTrader = useUpdate<Record<string, unknown>>('traders', ['traders'])
  const deleteTrader = useDelete('traders', ['traders'])

  const pendingTraders = traders.filter((t) => t.status === 'pending')
  const activeTraders = traders.filter((t) => t.status !== 'pending')

  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  const editFields = [...coreFields, ...statusFields]

  const handleSubmit = async (values: Record<string, string>) => {
    setCreateError('')
    setCreateLoading(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error || '생성 실패')
        return
      }
      setIsModalOpen(false)
      // traders 목록 갱신
      window.location.reload()
    } catch {
      setCreateError('서버 오류가 발생했습니다.')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEdit = (values: Record<string, string>) => {
    if (!editTarget) return
    const { name, role, status, ...metadata } = values
    updateTrader.mutate(
      { id: editTarget.id, name, role, status, metadata },
      { onSuccess: () => setEditTarget(null) }
    )
  }

  const columns = [
    { key: 'name', header: '이름' },
    { key: 'role', header: '역할',
      render: (row: Trader) => <StatusBadge status={row.role} />,
    },
    { key: 'status', header: '상태',
      render: (row: Trader) => <StatusBadge status={row.status} />,
    },
    { key: 'created_at', header: '등록일',
      render: (row: Trader) => new Date(row.created_at).toLocaleDateString('ko-KR'),
    },
    { key: 'actions', header: '액션',
      render: (row: Trader) => (
        <div className="flex gap-2">
          <button
            onClick={() => setEditTarget(row)}
            className="text-xs text-accent hover:text-accent-hover"
          >
            수정
          </button>
          <button
            onClick={() => {
              if (window.confirm(`"${row.name}" 트레이더를 삭제하시겠습니까?`)) {
                deleteTrader.mutate(row.id)
              }
            }}
            className="text-xs text-danger hover:text-red-400"
          >
            삭제
          </button>
        </div>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="트레이더 관리"
        description="트레이더 등록 및 관리"
        action={{ label: '트레이더 추가', onClick: () => setIsModalOpen(true) }}
      />

      {/* 가입 승인 대기 */}
      {pendingTraders.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            가입 승인 대기 ({pendingTraders.length}명)
          </h3>
          <div className="space-y-2">
            {pendingTraders.map((t) => {
              const meta = t.metadata as Record<string, string>
              const selectedRole = pendingRoles[t.id] ?? t.role
              return (
                <div
                  key={t.id}
                  className="glass-card p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted">
                      {meta.email} / {meta.phone} / {new Date(t.created_at).toLocaleDateString('ko-KR')} 신청
                    </p>
                    <p className="text-xs text-accent mt-1">
                      신청 권한: {ROLE_LABELS[meta.requested_role] ?? ROLE_LABELS[t.role]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={selectedRole}
                      onChange={(e) => setPendingRoles((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      className="px-2 py-1.5 text-xs bg-background border border-card-border rounded-lg
                                 text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="trader">Trader</option>
                      <option value="head_trader">Head Trader</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => updateTrader.mutate({ id: t.id, status: 'active', role: selectedRole })}
                      className="px-4 py-1.5 text-xs font-medium bg-success/20 text-success
                                 hover:bg-success/30 rounded-lg transition-colors"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`"${t.name}" 가입을 거절하시겠습니까?`)) {
                          updateTrader.mutate({ id: t.id, status: 'closed' })
                        }
                      }}
                      className="px-4 py-1.5 text-xs font-medium bg-danger/20 text-danger
                                 hover:bg-danger/30 rounded-lg transition-colors"
                    >
                      거절
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <DataTable columns={columns} data={activeTraders} isLoading={isLoading} />
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setCreateError('') }} title="트레이더 추가">
        {createError && <p className="text-danger text-sm mb-3">{createError}</p>}
        <DynamicForm
          fields={createFields}
          onSubmit={handleSubmit}
          submitLabel="계정 생성"
          isLoading={createLoading}
        />
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="트레이더 수정">
        {editTarget && (
          <DynamicForm
            fields={editFields}
            initialValues={{
              name: editTarget.name,
              role: editTarget.role,
              status: editTarget.status,
              ...(editTarget.metadata as Record<string, string>),
            }}
            onSubmit={handleEdit}
            submitLabel="수정"
            isLoading={updateTrader.isPending}
          />
        )}
      </Modal>
    </DashboardLayout>
  )
}
