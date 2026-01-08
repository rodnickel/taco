'use client'

import { useEffect, useRef } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus trap and escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmButtonClass =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-500 disabled:bg-red-600/50'
      : 'bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-zinc-400">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 ${confirmButtonClass} disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Aguarde...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
