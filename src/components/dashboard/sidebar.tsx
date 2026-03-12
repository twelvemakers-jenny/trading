'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'

// ── 모노크롬 라인 아이콘 (18×18, stroke) ──

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {children}
    </svg>
  )
}

const icons = {
  dashboard: (
    <Icon>
      <rect x="2" y="2" width="6" height="6" rx="1" />
      <rect x="10" y="2" width="6" height="3" rx="1" />
      <rect x="10" y="7" width="6" height="9" rx="1" />
      <rect x="2" y="10" width="6" height="6" rx="1" />
    </Icon>
  ),
  users: (
    <Icon>
      <circle cx="7" cy="5.5" r="2.5" />
      <path d="M2 15c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
      <circle cx="13" cy="6" r="2" />
      <path d="M13.5 10.5c1.5.3 3 1.6 3 3.5" />
    </Icon>
  ),
  bank: (
    <Icon>
      <path d="M2 7L9 3l7 4" />
      <path d="M3 7v7" />
      <path d="M7 7v7" />
      <path d="M11 7v7" />
      <path d="M15 7v7" />
      <path d="M1.5 14h15" />
      <path d="M1 16h16" />
    </Icon>
  ),
  coins: (
    <Icon>
      <ellipse cx="9" cy="5" rx="5.5" ry="2.5" />
      <path d="M3.5 5v4c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5V5" />
      <path d="M3.5 9v4c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5V9" />
    </Icon>
  ),
  transfer: (
    <Icon>
      <path d="M15 4H3" />
      <path d="M12 1l3 3-3 3" />
      <path d="M3 14h12" />
      <path d="M6 11l-3 3 3 3" />
    </Icon>
  ),
  chart: (
    <Icon>
      <path d="M3 15l4-5 3 2 5-7" />
      <path d="M12 5h3v3" />
    </Icon>
  ),
  clipboard: (
    <Icon>
      <rect x="4" y="2" width="10" height="14" rx="1.5" />
      <path d="M7 2V1h4v1" />
      <path d="M7 7h4" />
      <path d="M7 10h4" />
      <path d="M7 13h2" />
    </Icon>
  ),
  search: (
    <Icon>
      <circle cx="8" cy="8" r="5" />
      <path d="M15 15l-3.5-3.5" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="9" cy="9" r="2.5" />
      <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4" />
    </Icon>
  ),
  logout: (
    <Icon>
      <path d="M6.75 15.75H3.75a1.5 1.5 0 01-1.5-1.5V3.75a1.5 1.5 0 011.5-1.5h3" />
      <path d="M12 12.75L15.75 9 12 5.25" />
      <path d="M15.75 9H6.75" />
    </Icon>
  ),
  portfolio: (
    <Icon>
      <rect x="2" y="4" width="14" height="11" rx="1.5" />
      <path d="M6 4V2.5A1.5 1.5 0 017.5 1h3A1.5 1.5 0 0112 2.5V4" />
      <path d="M2 8.5h14" />
    </Icon>
  ),
  profile: (
    <Icon>
      <circle cx="9" cy="6" r="3" />
      <path d="M3 16c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5" />
      <path d="M13 5l2 2-2 2" />
    </Icon>
  ),
  exchange: (
    <Icon>
      <rect x="2" y="3" width="14" height="12" rx="1.5" />
      <path d="M2 7h14" />
      <path d="M6 10h2" />
      <path d="M10 10h4" />
      <path d="M6 12.5h2" />
    </Icon>
  ),
} as const

type IconKey = keyof typeof icons

// ── 네비게이션 데이터 (아이콘 키로 참조) ──

interface NavItem {
  href: string
  label: string
  iconKey: IconKey
}

// ── Admin 전용 메뉴 ──
const adminMainNav: NavItem[] = [
  { href: '/', label: '전체 현황판', iconKey: 'dashboard' },
  { href: '/admin/accounts', label: '계정원장', iconKey: 'bank' },
  { href: '/admin/allocations', label: '펀드 운용', iconKey: 'coins' },
  { href: '/admin/transfers', label: '이체 원장', iconKey: 'transfer' },
  { href: '/admin/positions', label: '포지션 관리', iconKey: 'chart' },
  { href: '/admin/history', label: '히스토리', iconKey: 'clipboard' },
  { href: '/admin/audit', label: '감사 추적', iconKey: 'search' },
]

const adminSettingsNav: NavItem[] = [
  { href: '/admin/traders', label: '트레이더 관리', iconKey: 'users' },
  { href: '/admin/schema', label: '필드 설정', iconKey: 'settings' },
  { href: '/trader/exchanges', label: '거래소 정보', iconKey: 'exchange' },
  { href: '/trader/profile', label: '정보 수정', iconKey: 'profile' },
]

// ── 일반 회원 (Trader / Head Trader) 메뉴 ──
const memberMainNav: NavItem[] = [
  { href: '/', label: '전체 현황판', iconKey: 'dashboard' },
  { href: '/trader/allocations', label: '펀드 운용', iconKey: 'coins' },
  { href: '/trader/transfers', label: '자금 이체', iconKey: 'transfer' },
  { href: '/trader/positions', label: '내 포지션', iconKey: 'chart' },
  { href: '/admin/history', label: '히스토리', iconKey: 'clipboard' },
]

const memberSubNav: NavItem[] = [
  { href: '/trader/exchanges', label: '거래소 정보', iconKey: 'exchange' },
  { href: '/admin/accounts', label: '계정원장', iconKey: 'bank' },
  { href: '/trader/profile', label: '정보 수정', iconKey: 'profile' },
  { href: '/admin/audit', label: '감사 추적', iconKey: 'search' },
]

const EXPANDED_W = 260
const COLLAPSED_W = 68

export function Sidebar() {
  const pathname = usePathname()
  const trader = useAuthStore((s) => s.trader)
  const collapsed = useAuthStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAuthStore((s) => s.toggleSidebar)

  const isAdmin = trader?.role === 'admin'
  const isHeadTrader = trader?.role === 'head_trader'

  // head_trader: 펀드 운용과 이체 원장은 admin 페이지(생성/편집 가능)로 라우팅
  const headTraderMainNav: NavItem[] = [
    { href: '/', label: '전체 현황판', iconKey: 'dashboard' },
    { href: '/admin/allocations', label: '펀드 운용', iconKey: 'coins' },
    { href: '/admin/transfers', label: '이체 원장', iconKey: 'transfer' },
    { href: '/trader/positions', label: '내 포지션', iconKey: 'chart' },
    { href: '/admin/history', label: '히스토리', iconKey: 'clipboard' },
  ]

  const SETTINGS_DIVIDER: NavItem & { href: '__divider__' } = {
    href: '__divider__' as '__divider__',
    label: isAdmin ? '관리 설정' : '기타',
    iconKey: 'settings',
  }

  const mainNav = isAdmin
    ? adminMainNav
    : isHeadTrader
      ? headTraderMainNav
      : memberMainNav

  const subNav = isAdmin ? adminSettingsNav : memberSubNav

  const finalNav: (NavItem | typeof SETTINGS_DIVIDER)[] = [...mainNav, SETTINGS_DIVIDER, ...subNav]

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <motion.aside
      className="fixed left-0 top-0 h-screen bg-[#0a0820]/80 backdrop-blur-3xl border-r border-white/[0.06] flex flex-col z-50 overflow-hidden
                 shadow-[4px_0_24px_rgba(0,0,0,0.4)]"
      animate={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* ── 헤더 ── */}
      <div
        className="border-b border-white/[0.04] flex items-center shrink-0"
        style={{ padding: collapsed ? '18px 13px' : '18px 20px', gap: collapsed ? 0 : 12 }}
      >
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="brand"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="min-w-0 flex-1 overflow-hidden"
            >
              <h1 className="text-[15px] font-semibold text-white whitespace-nowrap tracking-[0.06em] uppercase font-mono">
                Delta-Trading
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 whitespace-nowrap tracking-[0.02em]">
                Trading Dashboard
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={toggleSidebar}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg
                     text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all duration-200"
          title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
        >
          <motion.svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <path d="M10 3L5 8L10 13" />
          </motion.svg>
        </button>
      </div>

      {/* ── 네비게이션 ── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ padding: collapsed ? '14px 10px' : '14px 12px', display: 'flex', flexDirection: 'column', gap: collapsed ? 4 : 6 }}
      >
        {finalNav.map((item) => {
          if (item.href === '__divider__') {
            return (
              <div key="divider" className="pt-5 pb-2 px-1">
                <div className="border-t border-white/[0.04] mb-3" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-[10px] uppercase tracking-[0.10em] text-slate-500 font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )
          }

          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center rounded-xl transition-all duration-200 whitespace-nowrap
                ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-[9px] gap-3.5'}
                ${isActive
                  ? 'bg-white/[0.07] border border-white/[0.10] text-white backdrop-blur-sm shadow-[0_0_16px_rgba(99,102,241,0.10)]'
                  : 'border border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
            >
              <span className={`transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-300'}`}>
                {icons[item.iconKey]}
              </span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`overflow-hidden text-[15px] tracking-tight
                      ${isActive ? 'font-semibold text-white' : 'font-medium'}`}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* 활성 인디케이터 */}
              {isActive && (
                <motion.div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-full bg-indigo-400"
                  layoutId="activeIndicator"
                  transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── 하단 프로필 ── */}
      <div
        className="border-t border-white/[0.04] shrink-0"
        style={{ padding: collapsed ? '12px 8px' : '12px 14px' }}
      >
        {collapsed ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center py-1.5 text-slate-600 hover:text-rose-400 transition-colors duration-200"
            title="로그아웃"
          >
            {icons.logout}
          </button>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-300 truncate tracking-tight">
                {trader?.name ?? '...'}
              </p>
              <p className="text-[11px] text-slate-600 capitalize font-mono tracking-[0.01em]">
                {trader?.role ?? ''}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-[12px] text-slate-600 hover:text-rose-400 transition-colors duration-200 shrink-0 tracking-tight"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  )
}

export { EXPANDED_W, COLLAPSED_W }
