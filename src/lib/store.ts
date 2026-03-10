// Zustand 전역 상태 — 인증 사용자 + 트레이더 프로필
import { create } from 'zustand'
import type { Trader } from '@/types/database'

interface AuthState {
  trader: Trader | null
  isLoading: boolean
  sidebarCollapsed: boolean
  setTrader: (trader: Trader | null) => void
  setLoading: (loading: boolean) => void
  toggleSidebar: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  trader: null,
  isLoading: true,
  sidebarCollapsed: false,
  setTrader: (trader) => set({ trader, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))
