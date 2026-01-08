'use client'

import { useEffect, useRef } from 'react'

interface AlertModalProps {
  isOpen: boolean
  title?: string
  message: string
  buttonText?: string
  variant?: 'error' | 'success' | 'warning' | 'info'
  onClose: () => void
}

export function AlertModal({
  isOpen,
  title,
  message,
  buttonText = 'OK',
  variant = 'error',
  onClose,
}: AlertModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const iconColors = {
    error: 'text-red-400 bg-red-500/10',
    success: 'text-orange-400 bg-orange-500/10',
    warning: 'text-amber-400 bg-amber-500/10',
    info: 'text-blue-400 bg-blue-500/10',
  }

  const buttonColors = {
    error: 'bg-red-600 hover:bg-red-500',
    success: 'bg-orange-600 hover:bg-orange-500',
    warning: 'bg-amber-600 hover:bg-amber-500',
    info: 'bg-blue-600 hover:bg-blue-500',
  }

  const icons = {
    error: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
    success: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="p-6">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-full ${iconColors[variant]} flex items-center justify-center mx-auto mb-4`}>
            {icons[variant]}
          </div>

          {/* Content */}
          {title && (
            <h2 className="text-lg font-semibold text-white text-center mb-2">{title}</h2>
          )}
          <p className="text-zinc-400 text-center">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className={`px-6 py-2 ${buttonColors[variant]} text-white font-medium rounded-lg transition-colors`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}
