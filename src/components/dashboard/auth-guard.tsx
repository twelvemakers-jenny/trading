'use client'

import { useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import type { Trader } from '@/types/database'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { trader, isLoading, setTrader, setLoading } = useAuthStore()

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setTrader(null)
        return
      }

      const { data } = await supabase
        .from('traders')
        .select('*')
        .eq('auth_id', user.id)
        .single()

      setTrader(data as Trader | null)
    }

    // 이미 프로필이 로드된 상태면 재로딩 건너뛰기
    if (!trader) {
      loadProfile()
    } else if (isLoading) {
      setLoading(false)
    }

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setTrader(null)
        } else if (!trader) {
          loadProfile()
        }
      }
    )

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted text-sm">로딩 중...</div>
      </div>
    )
  }

  if (!trader) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <p className="text-foreground mb-2">프로필이 등록되지 않았습니다.</p>
          <p className="text-muted text-sm">관리자에게 문의하세요.</p>
        </div>
      </div>
    )
  }

  if (trader.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <p className="text-xl font-bold text-foreground mb-2">승인 대기 중</p>
          <p className="text-muted text-sm mb-6">
            가입 신청이 접수되었습니다.<br />
            관리자 승인 후 이용 가능합니다.
          </p>
          <button
            onClick={async () => {
              const supabase = (await import('@/lib/supabase/client')).createClient()
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
            className="px-6 py-2.5 bg-card-border/50 hover:bg-card-border text-foreground rounded-lg
                       text-sm transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
