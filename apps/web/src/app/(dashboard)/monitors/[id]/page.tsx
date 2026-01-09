'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { Monitor, ApiError, DailyUptimeData, Incident } from '@/lib/api'
import { ConfirmModal, AlertModal, UptimeBar } from '@/components'

const INCIDENTS_PER_PAGE = 10

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    return `${mins}min`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `há ${diffMins}min`
  if (diffHours < 24) return `há ${diffHours}h`
  return `há ${diffDays}d`
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

  // Incidents state
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [incidentsLoading, setIncidentsLoading] = useState(true)
  const [incidentsTotal, setIncidentsTotal] = useState(0)
  const [incidentPage, setIncidentPage] = useState(0)
  const [incidentFilter, setIncidentFilter] = useState<'all' | 'ongoing' | 'acknowledged' | 'resolved'>('all')

  useEffect(() => {
    loadMonitor()
    loadHistory()
  }, [id])

  useEffect(() => {
    if (id) {
      loadIncidents()
    }
  }, [id, incidentPage, incidentFilter])

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

  async function loadIncidents() {
    setIncidentsLoading(true)
    try {
      const data = await api.getIncidents({
        monitorId: id,
        status: incidentFilter === 'all' ? undefined : incidentFilter,
        limit: INCIDENTS_PER_PAGE,
        offset: incidentPage * INCIDENTS_PER_PAGE,
      })
      setIncidents(data.incidents)
      setIncidentsTotal(data.total)
    } catch (err) {
      console.error('Erro ao carregar incidentes:', err)
    } finally {
      setIncidentsLoading(false)
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

  async function handleAcknowledge(incidentId: string) {
    try {
      await api.acknowledgeIncident(incidentId)
      loadIncidents()
    } catch (err) {
      const apiError = err as ApiError
      setAlertModal({ open: true, message: apiError.error || 'Erro ao reconhecer incidente' })
    }
  }

  async function handleResolve(incidentId: string) {
    try {
      await api.resolveIncident(incidentId)
      loadIncidents()
    } catch (err) {
      const apiError = err as ApiError
      setAlertModal({ open: true, message: apiError.error || 'Erro ao resolver incidente' })
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
          <UptimeBar history={history} />
        </div>
      )}

      {/* Config */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
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

      {/* Incidents */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Incidentes {incidentsTotal > 0 && <span className="text-zinc-500">({incidentsTotal})</span>}
          </h2>
          <select
            value={incidentFilter}
            onChange={(e) => {
              setIncidentFilter(e.target.value as typeof incidentFilter)
              setIncidentPage(0)
            }}
            className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Todos</option>
            <option value="ongoing">Em andamento</option>
            <option value="acknowledged">Reconhecidos</option>
            <option value="resolved">Resolvidos</option>
          </select>
        </div>

        {incidentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            Nenhum incidente encontrado
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {incidents.map((incident) => {
                const statusStyles = {
                  ongoing: 'bg-red-500/10 border-red-500/30 text-red-400',
                  acknowledged: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
                  resolved: 'bg-green-500/10 border-green-500/30 text-green-400',
                }
                const statusLabels = {
                  ongoing: 'Em andamento',
                  acknowledged: 'Reconhecido',
                  resolved: 'Resolvido',
                }

                return (
                  <div
                    key={incident.id}
                    className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded border ${statusStyles[incident.status]}`}
                          >
                            {statusLabels[incident.status]}
                          </span>
                          <span className="text-zinc-500 text-xs">
                            {formatRelativeTime(incident.startedAt)}
                          </span>
                        </div>
                        <p className="text-white font-medium truncate">{incident.title}</p>
                        {incident.cause && (
                          <p className="text-zinc-400 text-sm mt-1 truncate">{incident.cause}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                          <span>Duração: {formatDuration(incident.duration)}</span>
                          {incident.resolvedAt && (
                            <span>Resolvido: {new Date(incident.resolvedAt).toLocaleString('pt-BR')}</span>
                          )}
                          {incident.acknowledgedBy && (
                            <span>Por: {incident.acknowledgedBy.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {incident.status === 'ongoing' && (
                          <>
                            <button
                              onClick={() => handleAcknowledge(incident.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/20 transition-colors"
                            >
                              Reconhecer
                            </button>
                            <button
                              onClick={() => handleResolve(incident.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-colors"
                            >
                              Resolver
                            </button>
                          </>
                        )}
                        {incident.status === 'acknowledged' && (
                          <button
                            onClick={() => handleResolve(incident.id)}
                            className="px-3 py-1.5 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-colors"
                          >
                            Resolver
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {incidentsTotal > INCIDENTS_PER_PAGE && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setIncidentPage((p) => Math.max(0, p - 1))}
                  disabled={incidentPage === 0}
                  className="px-3 py-1.5 text-sm font-medium bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-zinc-400">
                  Página {incidentPage + 1} de {Math.ceil(incidentsTotal / INCIDENTS_PER_PAGE)}
                </span>
                <button
                  onClick={() => setIncidentPage((p) => p + 1)}
                  disabled={(incidentPage + 1) * INCIDENTS_PER_PAGE >= incidentsTotal}
                  className="px-3 py-1.5 text-sm font-medium bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próximo
                </button>
              </div>
            )}
          </>
        )}
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
