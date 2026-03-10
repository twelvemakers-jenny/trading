'use client'

import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { useAuthStore } from '@/lib/store'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { TraderDashboard } from '@/components/dashboard/trader-dashboard'

export default function HomePage() {
  return (
    <DashboardLayout>
      <DashboardRouter />
    </DashboardLayout>
  )
}

function DashboardRouter() {
  const trader = useAuthStore((s) => s.trader)
  const isAdmin = trader?.role === 'admin' || trader?.role === 'head_trader'
  return isAdmin ? <AdminDashboard /> : <TraderDashboard />
}
