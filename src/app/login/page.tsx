'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

const STATS = [
  { label: 'ACTIVE POSITIONS', value: '24/7', sub: 'MONITORING' },
  { label: 'RISK MANAGEMENT', value: '< 2%', sub: 'MAX DRAWDOWN' },
  { label: 'FUND TRACKING', value: 'REAL-TIME', sub: 'AUDIT TRAIL' },
]

const FEATURES = [
  'Delta-Neutral Strategy',
  'Multi-Exchange Support',
  'Automated P&L Tracking',
  'Role-Based Access Control',
]

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.08,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError(authError.message); return }
      window.location.href = '/'
    } catch {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Mesh Gradient 배경 */}
      <div className="mesh-bg" />
      <div className="noise-overlay" />

      {/* Blurry Orbs — 유색 광원 */}
      <div className="absolute top-[-25%] left-[-5%] w-[700px] h-[700px] rounded-full bg-indigo-600/[0.10] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[550px] h-[550px] rounded-full bg-purple-600/[0.08] blur-[160px] pointer-events-none" />
      <div className="absolute top-[30%] right-[15%] w-[300px] h-[300px] rounded-full bg-blue-500/[0.06] blur-[120px] pointer-events-none" />

      {/* 벤토 그리드 컨테이너 */}
      <div className="w-full max-w-[960px] grid grid-cols-1 md:grid-cols-12 gap-3 relative z-10">

        {/* ── 타이틀 카드 ── */}
        <motion.div
          className="md:col-span-7 glass-bento p-6 sm:p-8 flex flex-col justify-between min-h-[160px]"
          variants={cardVariants} initial="hidden" animate="visible" custom={0}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-medium">System Online</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              Delta-Neutral<br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Trading Systems</span>
            </h1>
          </div>
          <p className="text-xs text-muted mt-4 tracking-wide">
            INSTITUTIONAL GRADE FUND MANAGEMENT PLATFORM
          </p>
        </motion.div>

        {/* ── 네트워크 상태 카드 ── */}
        <motion.div
          className="md:col-span-5 glass-bento p-6 flex flex-col justify-between"
          variants={cardVariants} initial="hidden" animate="visible" custom={1}
        >
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted mb-3">Network Status</div>
          <div className="space-y-2.5">
            {['Binance', 'Bybit', 'Bitget'].map((ex) => (
              <div key={ex} className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{ex}</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-mono">CONNECTED</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── 로그인 폼 카드 ── */}
        <motion.div
          className="md:col-span-5 glass-bento p-6 sm:p-8 md:row-span-2"
          variants={cardVariants} initial="hidden" animate="visible" custom={2}
        >
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-1">Access Terminal</h2>
            <div className="w-8 h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] text-muted mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl
                           text-white placeholder-white/20 focus:outline-none focus:border-indigo-400/40
                           focus:bg-white/[0.05] focus:shadow-[0_0_16px_rgba(99,102,241,0.1)] transition-all text-sm"
                placeholder="trader@delta-trading.com"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] text-muted mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl
                           text-white placeholder-white/20 focus:outline-none focus:border-indigo-400/40
                           focus:bg-white/[0.05] focus:shadow-[0_0_16px_rgba(99,102,241,0.1)] transition-all text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.div
                className="px-3 py-2 rounded-xl bg-rose-400/10 border border-rose-400/20"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-rose-400 text-xs">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500
                         hover:from-indigo-400 hover:to-purple-400 text-white rounded-2xl
                         font-semibold text-sm uppercase tracking-wider transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-[0_4px_24px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_32px_rgba(99,102,241,0.35)]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AUTHENTICATING...
                </span>
              ) : (
                'INITIALIZE ACCESS'
              )}
            </button>

            <Link
              href="/signup"
              className="block w-full py-3 text-center border border-white/[0.06] hover:border-white/[0.12]
                         text-slate-400 hover:text-white rounded-2xl font-medium text-sm uppercase tracking-wider
                         transition-all hover:bg-white/[0.03] hover:shadow-[0_0_16px_rgba(99,102,241,0.06)]"
            >
              SIGN UP
            </Link>
          </form>
        </motion.div>

        {/* ── 스탯 카드들 ── */}
        <div className="md:col-span-7 grid grid-cols-3 gap-3">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="glass-bento p-4 flex flex-col justify-between"
              variants={cardVariants} initial="hidden" animate="visible" custom={3 + i}
            >
              <span className="text-[9px] uppercase tracking-[0.15em] text-muted leading-tight">{stat.label}</span>
              <div className="mt-3">
                <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent font-mono">{stat.value}</span>
                <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{stat.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── 기능 목록 카드 ── */}
        <motion.div
          className="md:col-span-7 glass-bento p-5"
          variants={cardVariants} initial="hidden" animate="visible" custom={6}
        >
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted mb-3">Core Capabilities</div>
          <div className="grid grid-cols-2 gap-2">
            {FEATURES.map((feat) => (
              <div key={feat} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                <span className="text-xs text-slate-300">{feat}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── 하단 보안 바 ── */}
        <motion.div
          className="md:col-span-12 glass-bento px-5 py-3 flex items-center justify-between"
          variants={cardVariants} initial="hidden" animate="visible" custom={7}
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-muted uppercase tracking-wider">AES-256 Encrypted</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-white/20 font-mono">v2.0.0</span>
            <span className="text-[10px] text-white/20">&copy; 2026 Delta-Trading</span>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
