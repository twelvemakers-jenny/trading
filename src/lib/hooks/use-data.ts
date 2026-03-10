'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  Trader,
  Account,
  Allocation,
  Transfer,
  Position,
  SystemSchema,
  FundSnapshot,
} from '@/types/database'

const supabase = () => createClient()

// ============================================================
// 트레이더
// ============================================================
export function useTraders() {
  return useQuery({
    queryKey: ['traders'],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('traders')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Trader[]
    },
  })
}

// ============================================================
// 계정
// ============================================================
export function useAccounts(traderId?: string) {
  return useQuery({
    queryKey: ['accounts', traderId],
    queryFn: async () => {
      let query = supabase().from('accounts').select('*')
      if (traderId) query = query.eq('trader_id', traderId)
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      return data as Account[]
    },
  })
}

// ============================================================
// 할당
// ============================================================
export function useAllocations(traderId?: string) {
  return useQuery({
    queryKey: ['allocations', traderId],
    queryFn: async () => {
      let query = supabase().from('allocations').select('*')
      if (traderId) query = query.eq('trader_id', traderId)
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      return data as Allocation[]
    },
  })
}

// ============================================================
// 이체
// ============================================================
export function useTransfers(traderId?: string) {
  return useQuery({
    queryKey: ['transfers', traderId],
    queryFn: async () => {
      let query = supabase().from('transfers').select('*')
      if (traderId) query = query.eq('trader_id', traderId)
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      return data as Transfer[]
    },
  })
}

// ============================================================
// 포지션
// ============================================================
export function usePositions(traderId?: string, status?: string) {
  return useQuery({
    queryKey: ['positions', traderId, status],
    queryFn: async () => {
      let query = supabase().from('positions').select('*')
      if (traderId) query = query.eq('trader_id', traderId)
      if (status) query = query.eq('status', status)
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      return data as Position[]
    },
  })
}

// ============================================================
// 자금 스냅샷 (P&L/ROI 추적)
// ============================================================
export function useFundSnapshots(traderId?: string) {
  return useQuery({
    queryKey: ['fund_snapshots', traderId],
    queryFn: async () => {
      let query = supabase().from('fund_snapshots').select('*')
      if (traderId) query = query.eq('trader_id', traderId)
      const { data, error } = await query.order('snapshot_date', { ascending: true })
      if (error) throw error
      return data as FundSnapshot[]
    },
  })
}

// ============================================================
// 동적 스키마
// ============================================================
export function useSystemSchema(entityType: 'trader' | 'account' | 'exchange' | 'fund_settings' | 'risk_settings') {
  return useQuery({
    queryKey: ['system_schema', entityType],
    queryFn: async () => {
      const { data, error } = await supabase()
        .from('system_schema')
        .select('*')
        .eq('entity_type', entityType)
        .single()
      if (error) throw error
      return data as SystemSchema
    },
  })
}

// ============================================================
// 거래소 설정 (동적)
// ============================================================
export interface ExchangeConfig {
  name: string
  color: string
  rebate_pct: string
  reward_pct: string
  referral_url: string
  event_url: string
  admin_url: string
}

const DEFAULT_EXCHANGES: ExchangeConfig[] = [
  { name: 'Bitget', color: '#00c8b5', rebate_pct: '', reward_pct: '', referral_url: '', event_url: '', admin_url: '' },
  { name: 'WOO X', color: '#5b9cf6', rebate_pct: '', reward_pct: '', referral_url: '', event_url: '', admin_url: '' },
  { name: 'Biconomy', color: '#7b61ff', rebate_pct: '', reward_pct: '', referral_url: '', event_url: '', admin_url: '' },
  { name: 'Picol', color: '#e91e63', rebate_pct: '', reward_pct: '', referral_url: '', event_url: '', admin_url: '' },
  { name: 'Jucom', color: '#ff9800', rebate_pct: '', reward_pct: '', referral_url: '', event_url: '', admin_url: '' },
  { name: 'Tapbit', color: '#f7931a', rebate_pct: '', reward_pct: '', referral_url: '', event_url: '', admin_url: '' },
  { name: 'Digifinex', color: '#2b6def', rebate_pct: '', reward_pct: '', referral_url: '', event_url: '', admin_url: '' },
  { name: 'OrangeX', color: '#ff5722', rebate_pct: '', reward_pct: '', referral_url: '', event_url: '', admin_url: '' },
  { name: 'MEXC', color: '#2196f3', rebate_pct: '', reward_pct: '', referral_url: '', event_url: '', admin_url: '' },
  { name: 'Huobi', color: '#009688', rebate_pct: '', reward_pct: '', referral_url: '', event_url: '', admin_url: '' },
]

export function useExchanges() {
  const { data: schema, isLoading } = useSystemSchema('exchange')
  const exchanges: ExchangeConfig[] = (schema?.fields as unknown as ExchangeConfig[]) ?? DEFAULT_EXCHANGES
  const exchangeNames = exchanges.map((e) => e.name)
  const exchangeColors: Record<string, string> = {}
  for (const e of exchanges) {
    exchangeColors[e.name] = e.color || '#6b7280'
  }
  return { exchanges, exchangeNames, exchangeColors, isLoading }
}

// ============================================================
// 범용 Mutation (INSERT / UPDATE / DELETE)
// ============================================================
export function useInsert<T extends Record<string, unknown>>(
  table: string,
  invalidateKeys: string[]
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: T) => {
      const { data, error } = await supabase()
        .from(table)
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      )
    },
  })
}

export function useUpdate<T extends Record<string, unknown>>(
  table: string,
  invalidateKeys: string[]
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: T & { id: string }) => {
      const { data, error } = await supabase()
        .from(table)
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      )
    },
  })
}

export function useDelete(table: string, invalidateKeys: string[]) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase().from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      )
    },
  })
}
