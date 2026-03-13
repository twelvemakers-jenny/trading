'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { useExchanges } from '@/lib/hooks/use-data'

export default function ExchangesPage() {
  const { exchanges, isLoading } = useExchanges()

  return (
    <DashboardLayout>
      <PageHeader title="거래소 정보" description="등록된 거래소 정보를 확인합니다" />

      {isLoading ? (
        <div className="glass-card p-8 text-center text-muted text-sm">로딩 중...</div>
      ) : exchanges.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted text-sm">등록된 거래소가 없습니다.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exchanges.map((ex) => (
            <div key={ex.name} className="glass-card p-5 space-y-3">
              {/* 거래소 헤더 */}
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: ex.color || '#6b7280' }}
                />
                <h3 className="text-base font-semibold text-foreground">{ex.name}</h3>
              </div>

              {/* 정보 */}
              <div className="space-y-2 text-sm">
                {ex.rebate_pct && (
                  <InfoRow label="리베이트" value={`${ex.rebate_pct}%`} />
                )}
                {ex.reward_pct && (
                  <InfoRow label="리워드" value={`${ex.reward_pct}%`} />
                )}
                {ex.referral_url && (
                  <LinkRow label="레퍼럴 링크" url={ex.referral_url} />
                )}
                {ex.event_url && (
                  <LinkRow label="이벤트 링크" url={ex.event_url} />
                )}
                {ex.admin_url && (
                  <LinkRow label="관리자 링크" url={ex.admin_url} />
                )}
                {!ex.rebate_pct && !ex.reward_pct && !ex.referral_url && !ex.event_url && !ex.admin_url && (
                  <p className="text-xs text-muted">등록된 상세 정보가 없습니다.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted text-xs">{label}</span>
      <span className="text-foreground font-mono">{value}</span>
    </div>
  )
}

function LinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted text-xs shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover text-xs truncate max-w-[180px]"
          title={url}
        >
          {url.replace(/^https?:\/\//, '').split('/')[0]}
        </a>
        <button
          onClick={handleCopy}
          className="shrink-0 text-muted hover:text-foreground transition-colors"
          title="URL 복사"
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-success">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12a1.5 1.5 0 0 1 .439 1.061V14.5A1.5 1.5 0 0 1 15.5 16H14v-5.5a2.5 2.5 0 0 0-2.5-2.5H7V3.5Z" />
              <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5a.5.5 0 0 0-.5-.5h-4A1.5 1.5 0 0 1 7 10V6H4.5Z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
