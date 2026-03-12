'use client'

import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg sm:mx-4 p-5 sm:p-6 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto
                      bg-[#0e0b1e] backdrop-blur-xl rounded-t-2xl sm:rounded-3xl border border-white/[0.08]
                      shadow-[0_16px_64px_rgba(0,0,0,0.8),0_0_32px_rgba(99,102,241,0.06)]">
        {/* 모바일 드래그 핸들 */}
        <div className="flex justify-center mb-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xl">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
