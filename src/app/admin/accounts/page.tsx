'use client'

import { useState, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Modal } from '@/components/ui/modal'
import { KycAccountForm, SECTIONS, type KycFormData } from '@/components/forms/kyc-account-form'
import { useAccounts, useTraders, useInsert, useUpdate, useDelete } from '@/lib/hooks/use-data'
import { exportToExcel } from '@/lib/export-excel'
import type { Account } from '@/types/database'

export default function AccountsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | null>(null)
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState<string>('all')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [visiblePw, setVisiblePw] = useState<Set<string>>(new Set())

  const { data: accounts = [], isLoading } = useAccounts()
  const { data: traders = [] } = useTraders()
  const insertAccount = useInsert<Record<string, unknown>>('accounts', ['accounts'])
  const updateAccount = useUpdate<Record<string, unknown>>('accounts', ['accounts'])
  const deleteAccount = useDelete('accounts', ['accounts'])

  // 검색 필터
  const filtered = useMemo(() => {
    if (!search.trim()) return accounts
    const q = search.toLowerCase()
    return accounts.filter((a) => {
      const meta = a.metadata as Record<string, string>
      const searchable = [
        a.alias, a.exchange,
        meta.kyc_name, meta.eng_name, meta.gmail, meta.phone,
        meta.code, meta.brought_by, meta.sim_owner,
        meta.uid_bitget, meta.uid_picol, meta.uid_tapbit,
        meta.uid_digifinex, meta.uid_jucom, meta.uid_biconomy, meta.uid_ourbit,
        traders.find((t) => t.id === a.trader_id)?.name,
      ].filter(Boolean).join(' ').toLowerCase()
      return searchable.includes(q)
    })
  }, [accounts, search, traders])

  const traderOptions = useMemo(() =>
    traders.filter((t) => t.role !== 'admin' && t.status === 'active')
      .map((t) => ({ id: t.id, name: t.name })),
    [traders]
  )

  const handleCreate = (values: KycFormData) => {
    const { _trader_id, ...metadata } = values
    const alias = metadata.kyc_name
      ? `${metadata.kyc_name}_${metadata.code || 'new'}`
      : `account_${Date.now()}`

    // 거래소 결정: UID가 있는 첫 번째 거래소
    const exchangeMap: Record<string, string> = {
      uid_bitget: 'Bitget',
      uid_picol: 'Picol',
      uid_tapbit: 'Tapbit',
      uid_digifinex: 'Digifinex',
      uid_jucom: 'Jucom',
      uid_biconomy: 'Biconomy',
    }
    let exchange = 'Bitget'
    for (const [key, ex] of Object.entries(exchangeMap)) {
      if (metadata[key]) { exchange = ex; break }
    }

    const trader_id = _trader_id || null

    insertAccount.mutate(
      { ...(trader_id ? { trader_id } : {}), alias, exchange, status: 'active', metadata },
      { onSuccess: () => setIsModalOpen(false) }
    )
  }

  const handleEdit = (values: KycFormData) => {
    if (!editTarget) return
    const { _trader_id, ...metadata } = values
    updateAccount.mutate(
      { id: editTarget.id, metadata, ...(_trader_id ? { trader_id: _trader_id } : {}) },
      { onSuccess: () => setEditTarget(null) }
    )
  }

  // 정렬
  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      let valA: string
      let valB: string
      if (sortKey === '_trader') {
        valA = (traders.find((t) => t.id === a.trader_id)?.name ?? '').toLowerCase()
        valB = (traders.find((t) => t.id === b.trader_id)?.name ?? '').toLowerCase()
      } else {
        const metaA = a.metadata as Record<string, string>
        const metaB = b.metadata as Record<string, string>
        valA = (metaA[sortKey] || '').toLowerCase()
        valB = (metaB[sortKey] || '').toLowerCase()
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir, traders])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // 섹션별 표시 필드
  const sectionFields = activeSection === 'all'
    ? SECTIONS.flatMap((s) => s.fields)
    : SECTIONS.find((s) => s.title === activeSection)?.fields ?? []

  const handleExport = () => {
    const allFields = SECTIONS.flatMap((s) => s.fields)
    const rows = sorted.map((account) => {
      const meta = account.metadata as Record<string, string>
      const traderName = traders.find((t) => t.id === account.trader_id)?.name ?? ''
      const row: Record<string, unknown> = { traderName }
      for (const f of allFields) {
        row[f.key] = meta[f.key] ?? ''
      }
      return row
    })
    exportToExcel(
      rows,
      [
        { header: '트레이더', key: 'traderName' },
        ...allFields.map((f) => ({ header: f.label, key: f.key })),
      ],
      '계정원장',
    )
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="계정원장 (KYC 관리)"
        description={`총 ${accounts.length}개 계정`}
        actions={[
          { label: '엑셀 다운로드', onClick: handleExport, variant: 'secondary', confirm: '엑셀 파일을 다운로드 하시겠습니까?' },
          { label: '계정 추가', onClick: () => setIsModalOpen(true) },
        ]}
      />

      {/* 검색 + 섹션 필터 */}
      <div className="mb-4 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 이메일, UID, 연락처, 거래소 검색..."
          className="w-full px-4 py-2.5 bg-card border border-card-border rounded-lg
                     text-foreground placeholder-muted focus:outline-none focus:border-accent
                     transition-colors"
        />
        <div className="flex gap-2 flex-wrap">
          {['all', ...SECTIONS.map((s) => s.title)].map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors
                ${activeSection === sec
                  ? 'bg-accent text-white'
                  : 'bg-card-border/30 text-muted hover:text-foreground'
                }`}
            >
              {sec === 'all' ? '전체' : sec}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="glass-card p-8 text-center text-muted text-sm">로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted text-sm">
          {search ? `"${search}" 검색 결과 없음` : '등록된 계정이 없습니다.'}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="px-3 py-2 text-xs font-medium text-muted text-left whitespace-nowrap sticky left-0 bg-card z-10">
                    #
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-muted text-left whitespace-nowrap">
                    <button
                      onClick={() => handleSort('_trader')}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      트레이더
                      {sortKey === '_trader' ? (
                        <span className="text-accent">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
                      ) : (
                        <span className="opacity-30">{'\u25B2'}</span>
                      )}
                    </button>
                  </th>
                  {sectionFields.map((f) => (
                    <th key={f.key} className="px-3 py-2 text-xs font-medium text-muted text-left whitespace-nowrap">
                      <button
                        onClick={() => handleSort(f.key)}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {f.label}
                        {sortKey === f.key ? (
                          <span className="text-accent">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
                        ) : (
                          <span className="opacity-30">{'\u25B2'}</span>
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-xs font-medium text-muted text-left">액션</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((account, i) => {
                  const meta = account.metadata as Record<string, string>
                  return (
                    <tr
                      key={account.id}
                      className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors"
                    >
                      <td className="px-3 py-2 text-xs text-muted sticky left-0 bg-card z-10">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 text-sm whitespace-nowrap">
                        <select
                          value={account.trader_id ?? ''}
                          onChange={(e) => {
                            const newTraderId = e.target.value || null
                            updateAccount.mutate({
                              id: account.id,
                              trader_id: newTraderId,
                            })
                          }}
                          className="bg-card border border-card-border/50 rounded px-2 py-1 text-sm
                                     text-foreground focus:outline-none focus:border-accent transition-colors
                                     cursor-pointer hover:border-card-border
                                     [&>option]:bg-[#1e293b] [&>option]:text-white"
                        >
                          <option value="">미배정</option>
                          {traders
                            .filter((t) => t.status === 'active')
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} {t.role !== 'trader' ? `(${t.role === 'admin' ? '관리자' : '헤드'})` : ''}
                              </option>
                            ))}
                        </select>
                      </td>
                      {sectionFields.map((f) => {
                        const cellId = `${account.id}_${f.key}`
                        const isPassword = f.type === 'password'
                        const isRevealed = visiblePw.has(cellId)
                        const val = meta[f.key]

                        if (isPassword) {
                          return (
                            <td
                              key={f.key}
                              className="px-3 py-2 text-sm whitespace-nowrap max-w-[200px] truncate cursor-pointer select-none"
                              onClick={() => {
                                setVisiblePw((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(cellId)) next.delete(cellId)
                                  else next.add(cellId)
                                  return next
                                })
                              }}
                            >
                              {val
                                ? (isRevealed
                                    ? <span className="text-accent">{val}</span>
                                    : <span className="text-muted">{'••••••'}</span>)
                                : '-'
                              }
                            </td>
                          )
                        }

                        return (
                          <td key={f.key} className="px-3 py-2 text-sm whitespace-nowrap max-w-[200px] truncate">
                            {val || '-'}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 flex gap-2">
                        <button
                          onClick={() => setEditTarget(account)}
                          className="text-xs text-accent hover:text-accent-hover"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => {
                            const name = meta.kyc_name || account.alias
                            if (window.confirm(`"${name}" 계정을 삭제하시겠습니까?`)) {
                              deleteAccount.mutate(account.id)
                            }
                          }}
                          className="text-xs text-danger hover:text-red-400"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 추가 모달 */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="계정 추가">
        <KycAccountForm
          onSubmit={handleCreate}
          submitLabel="등록"
          isLoading={insertAccount.isPending}
          traderOptions={traderOptions}
        />
      </Modal>

      {/* 수정 모달 */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="계정 수정">
        {editTarget && (
          <KycAccountForm
            initialValues={editTarget.metadata as KycFormData}
            initialTraderId={editTarget.trader_id ?? undefined}
            onSubmit={handleEdit}
            submitLabel="수정"
            isLoading={updateAccount.isPending}
            traderOptions={traderOptions}
          />
        )}
      </Modal>
    </DashboardLayout>
  )
}
