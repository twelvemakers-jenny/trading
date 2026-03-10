'use client'

import { useState, useRef, useEffect } from 'react'
import { formatUSDT, formatUSDTInt, formatDollar, stripFormat } from '@/lib/calculations'

// ── 달러 포맷 인라인 입력 (TP, SL) ──

export function InlineDollar({
  value,
  onSave,
}: {
  value: string | null | undefined
  onSave: (v: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const startEdit = () => {
    setDraft(value && value !== '' ? String(value) : '')
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    const raw = stripFormat(draft)
    const newVal = raw && !isNaN(Number(raw)) ? raw : null
    const oldVal = value ?? null
    if (newVal !== oldVal) onSave(newVal)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-24 px-2 py-1.5 text-sm font-mono bg-background border border-accent rounded text-right text-foreground focus:outline-none"
      />
    )
  }

  return (
    <span
      onClick={startEdit}
      className="inline-block cursor-pointer hover:text-accent hover:bg-accent/10 transition-colors text-sm font-mono px-2 py-1.5 rounded -mx-2 -my-1"
      title="클릭하여 편집"
    >
      {formatDollar(value)}
    </span>
  )
}

// ── USDT 인라인 입력 (Reward, 종료자금) ──

export function InlineUSDT({
  value,
  onSave,
  integer,
}: {
  value: string | null | undefined
  onSave: (v: string | null) => void
  integer?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const startEdit = () => {
    setDraft(value && value !== '' ? String(value) : '')
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    const raw = stripFormat(draft)
    const newVal = raw && !isNaN(Number(raw)) ? raw : null
    const oldVal = value ?? null
    if (newVal !== oldVal) onSave(newVal)
  }

  const display = () => {
    if (!value || value === '') return '-'
    return integer ? formatUSDTInt(value) : formatUSDT(value)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-24 px-2 py-1.5 text-sm font-mono bg-background border border-accent rounded text-right text-foreground focus:outline-none"
      />
    )
  }

  return (
    <span
      onClick={startEdit}
      className="inline-block cursor-pointer hover:text-accent hover:bg-accent/10 transition-colors text-sm font-mono px-2 py-1.5 rounded -mx-2 -my-1"
      title="클릭하여 편집"
    >
      {display()}
    </span>
  )
}

// ── 인라인 셀렉트 (방향, 레버리지) ──

export function InlineSelect({
  value,
  options,
  onSave,
  renderLabel,
}: {
  value: string
  options: string[]
  onSave: (v: string) => void
  renderLabel?: (v: string) => React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => { if (e.target.value !== value) onSave(e.target.value) }}
      className="text-sm font-medium px-2 py-1.5 rounded border bg-background border-card-border text-foreground
                 cursor-pointer focus:outline-none focus:border-accent transition-colors appearance-auto"
    >
      {options.map((opt) => (
        <option key={opt} value={opt} className="bg-gray-900">
          {renderLabel ? renderLabel(opt) : opt}
        </option>
      ))}
    </select>
  )
}

// ── 인라인 날짜 입력 ──

export function InlineDate({
  value,
  onSave,
}: {
  value: string | null | undefined
  onSave: (v: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const startEdit = () => {
    setDraft(value ?? '')
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    const raw = draft || null
    const newVal = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null
    const oldVal = value ?? null
    if (newVal !== oldVal) onSave(newVal)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={draft}
        max="9999-12-31"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-32 px-2 py-1.5 text-sm bg-background border border-accent rounded text-foreground focus:outline-none"
      />
    )
  }

  return (
    <span
      onClick={startEdit}
      className="inline-block cursor-pointer hover:text-accent hover:bg-accent/10 transition-colors text-sm px-2 py-1.5 rounded -mx-2 -my-1"
      title="클릭하여 편집"
    >
      {value ?? '-'}
    </span>
  )
}
