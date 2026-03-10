'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { useAuthStore } from '@/lib/store'
import { useUpdate } from '@/lib/hooks/use-data'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  head_trader: 'Head Trader',
  trader: 'Trader',
}

export default function ProfilePage() {
  const trader = useAuthStore((s) => s.trader)
  const setTrader = useAuthStore((s) => s.setTrader)

  const [name, setName] = useState(trader?.name ?? '')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState('')

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  const updateTrader = useUpdate<Record<string, unknown>>('traders', ['traders'])

  const meta = (trader?.metadata ?? {}) as Record<string, string>

  const handleNameChange = () => {
    if (!trader || !name.trim()) return
    if (name.trim() === trader.name) {
      setNameMsg('변경된 내용이 없습니다.')
      return
    }
    setNameLoading(true)
    setNameMsg('')
    updateTrader.mutate(
      { id: trader.id, name: name.trim() },
      {
        onSuccess: () => {
          setTrader({ ...trader, name: name.trim() })
          setNameMsg('이름이 변경되었습니다.')
          setNameLoading(false)
        },
        onError: () => {
          setNameMsg('이름 변경에 실패했습니다.')
          setNameLoading(false)
        },
      }
    )
  }

  const handlePasswordChange = async () => {
    if (!trader) return
    setPwMsg('')

    if (!newPw || !confirmPw) {
      setPwMsg('새 비밀번호를 입력해주세요.')
      return
    }
    if (newPw.length < 6) {
      setPwMsg('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (newPw !== confirmPw) {
      setPwMsg('새 비밀번호가 일치하지 않습니다.')
      return
    }

    setPwLoading(true)
    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: trader.auth_id, newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPwMsg(data.error || '비밀번호 변경 실패')
        return
      }
      setPwMsg('비밀번호가 변경되었습니다.')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch {
      setPwMsg('서버 오류가 발생했습니다.')
    } finally {
      setPwLoading(false)
    }
  }

  const inputClass = `w-full px-4 py-2.5 bg-background border border-card-border rounded-lg
    text-foreground placeholder-muted focus:outline-none focus:border-accent transition-colors text-sm`

  return (
    <DashboardLayout>
      <PageHeader title="정보 수정" description="개인 정보를 수정합니다" />

      <div className="max-w-lg space-y-6">
        {/* 기본 정보 (읽기 전용) */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">기본 정보</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted block mb-1">이메일 (로그인 ID)</label>
              <p className="text-sm text-foreground font-mono bg-card-border/20 px-4 py-2.5 rounded-lg">
                {meta.email ?? '-'}
              </p>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">역할</label>
              <p className="text-sm text-foreground bg-card-border/20 px-4 py-2.5 rounded-lg">
                {ROLE_LABELS[trader?.role ?? ''] ?? trader?.role}
              </p>
            </div>
          </div>
        </div>

        {/* 이름 변경 */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">이름 변경</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted block mb-1">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="이름을 입력하세요"
              />
            </div>
            {nameMsg && (
              <p className={`text-xs ${nameMsg.includes('실패') || nameMsg.includes('없습니다') ? 'text-danger' : 'text-success'}`}>
                {nameMsg}
              </p>
            )}
            <button
              onClick={handleNameChange}
              disabled={nameLoading}
              className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white
                         rounded-lg transition-colors disabled:opacity-50"
            >
              {nameLoading ? '저장 중...' : '이름 저장'}
            </button>
          </div>
        </div>

        {/* 비밀번호 변경 */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">비밀번호 변경</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted block mb-1">새 비밀번호</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className={inputClass}
                placeholder="새 비밀번호 (6자 이상)"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">새 비밀번호 확인</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className={inputClass}
                placeholder="새 비밀번호를 다시 입력하세요"
              />
            </div>
            {pwMsg && (
              <p className={`text-xs ${pwMsg.includes('변경되었습니다') ? 'text-success' : 'text-danger'}`}>
                {pwMsg}
              </p>
            )}
            <button
              onClick={handlePasswordChange}
              disabled={pwLoading}
              className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white
                         rounded-lg transition-colors disabled:opacity-50"
            >
              {pwLoading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
