'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { StatusPage, ApiError } from '@/lib/api'
import { ConfirmModal, AlertModal } from '@/components'

function StatusIndicator({ monitors }: { monitors: StatusPage['monitors'] }) {
  const allUp = monitors.every((m) => m.monitor.currentStatus === 'up')
  const anyDown = monitors.some((m) => m.monitor.currentStatus === 'down')

  if (monitors.length === 0) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-md border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
        Sem monitors
      </span>
    )
  }

  if (anyDown) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-md border bg-red-500/10 text-red-400 border-red-500/20">
        Com problemas
      </span>
    )
  }

  if (allUp) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-md border bg-orange-500/10 text-orange-400 border-orange-500/20">
        Operacional
      </span>
    )
  }

  return (
    <span className="px-2 py-0.5 text-xs font-medium rounded-md border bg-amber-500/10 text-amber-400 border-amber-500/20">
      Parcial
    </span>
  )
}

export default function StatusPagesPage() {
  const router = useRouter()
  const [statusPages, setStatusPages] = useState<StatusPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' })
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  useEffect(() => {
    loadStatusPages()
  }, [])

  async function loadStatusPages() {
    try {
      const response = await api.getStatusPages()
      setStatusPages(response.statusPages)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === 'UNAUTHORIZED') {
        router.push('/login')
        return
      }
      setError(apiError.error || 'Erro ao carregar páginas de status')
    } finally {
      setLoading(false)
    }
  }

  function handleDeleteClick(id: string, name: string) {
    setDeleteModal({ open: true, id, name })
  }

  async function handleDeleteConfirm() {
    const { id } = deleteModal
    setDeleteModal({ open: false, id: '', name: '' })

    try {
      await api.deleteStatusPage(id)
      setStatusPages(statusPages.filter((sp) => sp.id !== id))
    } catch (err) {
      const apiError = err as ApiError
      setAlertModal({ open: true, message: apiError.error || 'Erro ao deletar página de status' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400">Carregando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Status Pages</h1>
          <p className="text-zinc-400 mt-1">Crie páginas públicas de status para seus serviços</p>
        </div>
        <Link
          href="/status-pages/new"
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nova Status Page
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Empty state */}
      {statusPages.length === 0 && !error && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Nenhuma página de status</h2>
          <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
            Crie uma página de status pública para compartilhar o estado dos seus serviços
          </p>
          <Link
            href="/status-pages/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Criar primeira página
          </Link>
        </div>
      )}

      {/* Status Pages grid */}
      {statusPages.length > 0 && (
        <div className="grid gap-4">
          {statusPages.map((statusPage) => (
            <div
              key={statusPage.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: statusPage.primaryColor + '20' }}
                  >
                    <svg className="w-5 h-5" style={{ color: statusPage.primaryColor }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/status-pages/${statusPage.id}`}
                        className="text-lg font-medium text-white hover:text-orange-400 transition-colors"
                      >
                        {statusPage.name}
                      </Link>
                      <StatusIndicator monitors={statusPage.monitors} />
                      {!statusPage.isPublic && (
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">privado</span>
                      )}
                    </div>
                    <a
                      href={`/status/${statusPage.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
                    >
                      /status/{statusPage.slug}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-zinc-500">Monitors</p>
                      <p className="font-medium text-white">{statusPage.monitors.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-zinc-500">Histórico</p>
                      <p className="font-medium text-white">{statusPage.historyDays} dias</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`/status/${statusPage.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                      title="Ver página pública"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                    <Link
                      href={`/status-pages/${statusPage.id}/edit`}
                      className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(statusPage.id, statusPage.name)}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Deletar"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                    <Link
                      href={`/status-pages/${statusPage.id}`}
                      className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Ver detalhes"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        title="Deletar Status Page"
        message={`Tem certeza que deseja deletar a página "${deleteModal.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Deletar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ open: false, id: '', name: '' })}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.open}
        title="Erro"
        message={alertModal.message}
        variant="error"
        onClose={() => setAlertModal({ open: false, message: '' })}
      />
    </div>
  )
}
