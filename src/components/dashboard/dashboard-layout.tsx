'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Sidebar, EXPANDED_W, COLLAPSED_W } from './sidebar'
import { AuthGuard } from './auth-guard'
import { useAuthStore } from '@/lib/store'

export function DashboardLayout({ children }: { children: ReactNode }) {
  const collapsed = useAuthStore((s) => s.sidebarCollapsed)

  return (
    <AuthGuard>
      <div className="flex min-h-screen relative">
        {/* Mesh Gradient 배경 */}
        <div className="mesh-bg" />
        {/* 노이즈 질감 */}
        <div className="noise-overlay" />

        {/* 유색 광원 Blurry Orbs */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-15%] left-[5%] w-[600px] h-[600px] rounded-full bg-indigo-600/[0.07] blur-[150px]" />
          <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-purple-600/[0.06] blur-[140px]" />
          <div className="absolute top-[40%] right-[25%] w-[350px] h-[350px] rounded-full bg-blue-500/[0.04] blur-[120px]" />
        </div>

        <Sidebar />
        <motion.main
          className="flex-1 p-6 overflow-x-auto min-w-0 relative z-10"
          animate={{ marginLeft: collapsed ? COLLAPSED_W : EXPANDED_W }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {children}
        </motion.main>
      </div>
    </AuthGuard>
  )
}
