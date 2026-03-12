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
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60]">
      {/* 배경 딤 */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

      {/* 스크롤 영역 — 세로만 스크롤, 가로는 패딩으로 제한 */}
      <div
        className="absolute inset-0 overflow-y-auto overscroll-contain"
        onClick={onClose}
      >
        <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
          <div
            className="relative w-full max-w-lg p-4 sm:p-6
                        bg-[#0e0b1e] backdrop-blur-xl rounded-2xl border border-white/[0.08]
                        shadow-[0_16px_64px_rgba(0,0,0,0.8),0_0_32px_rgba(99,102,241,0.06)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
              <button onClick={onClose} className="text-muted hover:text-foreground text-xl leading-none p-1">
                &times;
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
