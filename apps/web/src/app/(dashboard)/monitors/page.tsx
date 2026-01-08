'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { Monitor, ApiError } from '@/lib/api'
import { ConfirmModal, AlertModal } from '@/components'

function StatusDot({ status }: { status: Monitor['currentStatus'] }) {
  const colors = {
    up: 'bg-emerald-500',
    down: 'bg-red-500',
    degraded: 'bg-amber-500',
    unknown: 'bg-zinc-500',
  }

  return (
    <span className={`w-2 h-2 rounded-full ${colors[status || 'unknown']} animate-pulse`} />
  )
}

function StatusBadge({ status }: { status: Monitor['currentStatus'] }) {
  const styles = {
    up: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    down: 'bg-red-500/10 text-red-400 border-red-500/20',
    degraded: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    unknown: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  }

  const labels = {
    up: 'Online',
    down: 'Offline',
    degraded: 'Degradado',
    unknown: 'Aguardando',
  }

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${styles[status || 'unknown']}`}>
      {labels[status || 'unknown']}
    </span>
  )
}

export default function MonitorsPage() {
  const router = useRouter()
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' })
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  useEffect(() => {
    loadMonitors()
  }, [])

  async function loadMonitors() {
    try {
      const response = await api.getMonitors()
      setMonitors(response.monitors)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === 'UNAUTHORIZED') {
        router.push('/login')
        return
      }
      setError(apiError.error || 'Erro ao carregar monitors')
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
      await api.deleteMonitor(id)
      setMonitors(monitors.filter((m) => m.id !== id))
    } catch (err) {
      const apiError = err as ApiError
      setAlertModal({ open: true, message: apiError.error || 'Erro ao deletar monitor' })
    }
  }

  async function handleToggleActive(monitor: Monitor) {
    try {
      const updated = await api.updateMonitor(monitor.id, { active: !monitor.active })
      setMonitors(monitors.map((m) => (m.id === monitor.id ? updated : m)))
    } catch (err) {
      const apiError = err as ApiError
      setAlertModal({ open: true, message: apiError.error || 'Erro ao atualizar monitor' })
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
          <h1 className="text-2xl font-bold text-white">Monitors</h1>
          <p className="text-zinc-400 mt-1">Gerencie seus monitors de uptime</p>
        </div>
        <Link
          href="/monitors/new"
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Novo Monitor
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Empty state */}
      {monitors.length === 0 && !error && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Nenhum monitor configurado</h2>
          <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
            Crie seu primeiro monitor para começar a monitorar seus serviços
          </p>
          <Link
            href="/monitors/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Criar primeiro monitor
          </Link>
        </div>
      )}

      {/* Monitors grid */}
      {monitors.length > 0 && (
        <div className="grid gap-4">
          {monitors.map((monitor) => (
            <div
              key={monitor.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <StatusDot status={monitor.currentStatus} />
                  <div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/monitors/${monitor.id}`}
                        className="text-lg font-medium text-white hover:text-orange-400 transition-colors"
                      >
                        {monitor.name}
                      </Link>
                      <StatusBadge status={monitor.currentStatus} />
                      {!monitor.active && (
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">pausado</span>
                      )}
                    </div>
                    <a
                      href={monitor.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
                    >
                      {monitor.url}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-zinc-500">Uptime</p>
                      <p className="font-medium text-white">
                        {monitor.uptimePercentage !== undefined
                          ? `${monitor.uptimePercentage.toFixed(2)}%`
                          : '-'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-zinc-500">Latência</p>
                      <p className="font-medium text-white">
                        {monitor.lastLatency !== undefined ? `${monitor.lastLatency}ms` : '-'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-zinc-500">Intervalo</p>
                      <p className="font-medium text-white">{monitor.intervalSeconds}s</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(monitor)}
                      className={`p-2 rounded-lg transition-colors ${
                        monitor.active
                          ? 'text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10'
                          : 'text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10'
                      }`}
                      title={monitor.active ? 'Pausar' : 'Ativar'}
                    >
                      {monitor.active ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                      )}
                    </button>
                    <Link
                      href={`/monitors/${monitor.id}/edit`}
                      className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(monitor.id, monitor.name)}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Deletar"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                    <Link
                      href={`/monitors/${monitor.id}`}
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
        title="Deletar Monitor"
        message={`Tem certeza que deseja deletar o monitor "${deleteModal.name}"? Esta ação não pode ser desfeita.`}
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
