'use client'

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
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted text-xs shrink-0">{label}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:text-accent-hover text-xs truncate max-w-[180px]"
        title={url}
      >
        {url.replace(/^https?:\/\//, '').split('/')[0]}
      </a>
    </div>
  )
}
