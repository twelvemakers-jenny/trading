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
    <div className="fixed inset-0 z-[60] overflow-auto">
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg p-5 sm:p-6 my-auto
                        bg-[#0e0b1e] backdrop-blur-xl rounded-2xl border border-white/[0.08]
                        shadow-[0_16px_64px_rgba(0,0,0,0.8),0_0_32px_rgba(99,102,241,0.06)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-muted hover:text-foreground text-xl">
              &times;
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
