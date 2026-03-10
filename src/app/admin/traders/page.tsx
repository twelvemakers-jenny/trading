'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Modal } from '@/components/ui/modal'
import { DynamicForm } from '@/components/forms/dynamic-form'
import { useTraders, useUpdate, useDelete } from '@/lib/hooks/use-data'
import type { Trader, FieldDefinition } from '@/types/database'

interface AuthUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
}

const coreFields: FieldDefinition[] = [
  { key: 'name', label: '트레이더명', type: 'text', required: true },
  { key: 'phone', label: '연락처', type: 'text', required: false },
  { key: 'role', label: '역할', type: 'select', required: true, options: ['admin', 'head_trader', 'trader'] },
  { key: 'status', label: '상태', type: 'select', required: true, options: ['active', 'dormant', 'closed'] },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  head_trader: 'Head Trader',
  trader: 'Trader',
}

export default function TradersPage() {
  const [editTarget, setEditTarget] = useState<Trader | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({})
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([])
  const [authLoading, setAuthLoading] = useState(false)
  const { data: traders = [], isLoading, refetch } = useTraders()
  const updateTrader = useUpdate<Record<string, unknown>>('traders', ['traders'])
  const deleteTrader = useDelete('traders', ['traders'])

  useEffect(() => {
    setAuthLoading(true)
    fetch('/api/admin/users')
      .then((res) => res.json())
      .then((data) => setAuthUsers(data.users ?? []))
      .catch(() => setAuthUsers([]))
      .finally(() => setAuthLoading(false))
  }, [])

  const pendingTraders = traders.filter((t) => t.status === 'pending')
  const activeTraders = traders.filter((t) => t.status !== 'pending')

  const createFields: FieldDefinition[] = [
    { key: 'email', label: '이메일 (로그인 ID)', type: 'text', required: true },
    { key: 'password', label: '비밀번호', type: 'text', required: true },
    { key: 'name', label: '이름', type: 'text', required: true },
    { key: 'role', label: '권한', type: 'select', required: true, options: ['trader', 'head_trader'] },
    { key: 'phone', label: '연락처', type: 'text', required: false },
  ]

  const handleCreate = async (values: Record<string, string>) => {
    setCreateError('')
    setCreateLoading(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          name: values.name,
          role: values.role,
          phone: values.phone || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error || '생성 실패')
        return
      }
      setIsCreateOpen(false)
      refetch()
    } catch {
      setCreateError('서버 오류가 발생했습니다.')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEdit = (values: Record<string, string>) => {
    if (!editTarget) return
    const { name, role, status, phone } = values
    const prevMeta = (editTarget.metadata ?? {}) as Record<string, unknown>
    updateTrader.mutate(
      { id: editTarget.id, name, role, status, metadata: { ...prevMeta, phone: phone || '' } },
      { onSuccess: () => setEditTarget(null) }
    )
  }

  // 트레이더 테이블에 없는 Auth 유저 (미등록 회원)
  const traderAuthIds = new Set(traders.map((t) => t.auth_id))
  const unmatchedAuthUsers = authUsers.filter((u) => !traderAuthIds.has(u.id))

  const columns = [
    { key: 'name', header: '이름' },
    { key: 'email', header: '이메일',
      render: (row: Trader) => {
        const meta = row.metadata as Record<string, string> | undefined
        return <span className="text-xs text-slate-400">{meta?.email ?? '-'}</span>
      },
    },
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
        description="가입 신청을 승인하고 트레이더를 관리합니다"
        action={{ label: '트레이더 추가', onClick: () => setIsCreateOpen(true) }}
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
                    <p className="text-xs text-slate-400">
                      {meta?.email ?? '-'} / {meta?.phone ?? '-'} / {new Date(t.created_at).toLocaleDateString('ko-KR')} 신청
                    </p>
                    <p className="text-xs text-slate-500 mt-1">가입 승인 대기</p>
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

      {pendingTraders.length === 0 && !isLoading && (
        <div className="mb-6 glass-card p-4 text-center text-slate-500 text-sm">
          대기 중인 가입 신청이 없습니다.
        </div>
      )}

      <h3 className="text-sm font-semibold text-foreground mb-3">
        등록된 트레이더 ({activeTraders.length}명)
      </h3>
      <DataTable columns={columns} data={activeTraders} isLoading={isLoading} />

      {/* 가입 회원 목록 (트레이더 미등록) */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          가입 회원 목록 ({authUsers.length}명)
        </h3>
        {authLoading ? (
          <div className="glass-card p-4 text-center text-slate-500 text-sm">로딩 중...</div>
        ) : authUsers.length === 0 ? (
          <div className="glass-card p-4 text-center text-slate-500 text-sm">가입된 회원이 없습니다.</div>
        ) : (
          <DataTable
            columns={[
              { key: 'email', header: '이메일' },
              { key: 'status', header: '상태',
                render: (row: AuthUser) => {
                  const isTrader = traderAuthIds.has(row.id)
                  return isTrader
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">트레이더 등록</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">미등록</span>
                },
              },
              { key: 'email_confirmed_at', header: '이메일 인증',
                render: (row: AuthUser) => row.email_confirmed_at
                  ? <span className="text-xs text-success">인증됨</span>
                  : <span className="text-xs text-slate-500">미인증</span>,
              },
              { key: 'last_sign_in_at', header: '마지막 로그인',
                render: (row: AuthUser) => row.last_sign_in_at
                  ? new Date(row.last_sign_in_at).toLocaleDateString('ko-KR')
                  : <span className="text-xs text-slate-500">없음</span>,
              },
              { key: 'created_at', header: '가입일',
                render: (row: AuthUser) => new Date(row.created_at).toLocaleDateString('ko-KR'),
              },
            ]}
            data={authUsers}
            isLoading={authLoading}
          />
        )}
      </div>

      {/* 트레이더 추가 모달 */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); setCreateError('') }} title="트레이더 추가">
        {createError && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
            {createError}
          </div>
        )}
        <DynamicForm
          fields={createFields}
          onSubmit={handleCreate}
          submitLabel="생성"
          isLoading={createLoading}
        />
      </Modal>

      {/* 수정 모달 */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="트레이더 수정">
        {editTarget && (() => {
          const meta = editTarget.metadata as Record<string, string> | undefined
          return (
            <>
              <div className="mb-5 p-3 rounded-lg bg-card-border/10 border border-card-border/30">
                <p className="text-xs text-slate-500 mb-1">ID (Email)</p>
                <p className="text-sm text-foreground font-mono">{meta?.email ?? '-'}</p>
              </div>
              <DynamicForm
                fields={coreFields}
                initialValues={{
                  name: editTarget.name,
                  phone: meta?.phone ?? '',
                  role: editTarget.role,
                  status: editTarget.status,
                }}
                onSubmit={handleEdit}
                submitLabel="수정"
                isLoading={updateTrader.isPending}
              />
            </>
          )
        })()}
      </Modal>
    </DashboardLayout>
  )
}
