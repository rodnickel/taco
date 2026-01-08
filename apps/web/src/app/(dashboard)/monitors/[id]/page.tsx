'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { Monitor, ApiError, DailyUptimeData } from '@/lib/api'
import { ConfirmModal, AlertModal, UptimeBar } from '@/components'

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
    <span className={`px-3 py-1 text-sm font-medium rounded-lg border ${styles[status || 'unknown']}`}>
      {labels[status || 'unknown']}
    </span>
  )
}

export default function MonitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [monitor, setMonitor] = useState<Monitor | null>(null)
  const [history, setHistory] = useState<DailyUptimeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  useEffect(() => {
    loadMonitor()
    loadHistory()
  }, [id])

  async function loadMonitor() {
    try {
      const data = await api.getMonitor(id)
      setMonitor(data)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === 'UNAUTHORIZED') {
        router.push('/login')
        return
      }
      setError(apiError.error || 'Erro ao carregar monitor')
    } finally {
      setLoading(false)
    }
  }

  async function loadHistory() {
    try {
      const data = await api.getMonitorHistory(id, 90)
      setHistory(data.history)
    } catch (err) {
      // Silently fail - history is not critical
      console.error('Erro ao carregar histórico:', err)
    }
  }

  async function handleToggleActive() {
    if (!monitor) return

    try {
      const updated = await api.updateMonitor(monitor.id, { active: !monitor.active })
      setMonitor(updated)
    } catch (err) {
      const apiError = err as ApiError
      setAlertModal({ open: true, message: apiError.error || 'Erro ao atualizar monitor' })
    }
  }

  function handleDeleteClick() {
    setDeleteModalOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!monitor) return
    setDeleteModalOpen(false)

    try {
      await api.deleteMonitor(monitor.id)
      router.push('/monitors')
    } catch (err) {
      const apiError = err as ApiError
      setAlertModal({ open: true, message: apiError.error || 'Erro ao deletar monitor' })
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

  if (error || !monitor) {
    return (
      <div className="p-8">
        <Link
          href="/monitors"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Monitors
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error || 'Monitor não encontrado'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/monitors"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Monitors
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{monitor.name}</h1>
            <StatusBadge status={monitor.currentStatus} />
            {!monitor.active && (
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">pausado</span>
            )}
          </div>
          <a
            href={monitor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-orange-400 transition-colors"
          >
            {monitor.url}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleActive}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              monitor.active
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-orange-600 text-white hover:bg-orange-500'
            }`}
          >
            {monitor.active ? 'Pausar' : 'Ativar'}
          </button>
          <Link
            href={`/monitors/${monitor.id}/edit`}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Editar
          </Link>
          <button
            onClick={handleDeleteClick}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Deletar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <p className="text-zinc-400 text-sm mb-1">Uptime</p>
          <p className="text-3xl font-bold text-white">
            {monitor.uptimePercentage !== undefined
              ? `${monitor.uptimePercentage.toFixed(2)}%`
              : '-'}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-zinc-400 text-sm mb-1">Latência</p>
          <p className="text-3xl font-bold text-white">
            {monitor.lastLatency !== undefined ? `${monitor.lastLatency}ms` : '-'}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-zinc-400 text-sm mb-1">Última Verificação</p>
          <p className="text-lg font-medium text-white">
            {monitor.lastCheck
              ? new Date(monitor.lastCheck).toLocaleString('pt-BR')
              : 'Nunca'}
          </p>
        </div>
      </div>

      {/* Uptime History */}
      {history.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Histórico de Uptime</h2>
          <UptimeBar history={history} uptimePercentage={monitor.uptimePercentage} />
        </div>
      )}

      {/* Config */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Configuração</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-zinc-500 text-sm">Método</p>
            <p className="text-white font-medium mt-1">{monitor.method}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Status Esperado</p>
            <p className="text-white font-medium mt-1">{monitor.expectedStatus}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Intervalo</p>
            <p className="text-white font-medium mt-1">{monitor.intervalSeconds}s</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Timeout</p>
            <p className="text-white font-medium mt-1">{monitor.timeout}s</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Verificar SSL</p>
            <p className="text-white font-medium mt-1">{monitor.checkSsl ? 'Sim' : 'Não'}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Alertas</p>
            <p className={`font-medium mt-1 ${monitor.alertsEnabled ? 'text-orange-400' : 'text-zinc-500'}`}>
              {monitor.alertsEnabled ? 'Ativados' : 'Desativados'}
            </p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Criado em</p>
            <p className="text-white font-medium mt-1">
              {new Date(monitor.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Deletar Monitor"
        message={`Tem certeza que deseja deletar o monitor "${monitor.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Deletar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
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
