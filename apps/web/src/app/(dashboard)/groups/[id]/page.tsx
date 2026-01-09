'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { MonitorGroup, MonitorInGroup, ApiError, GroupStatus } from '@/lib/api'
import { ConfirmModal, AlertModal } from '@/components'

function GroupStatusBadge({ status }: { status: GroupStatus }) {
  const styles = {
    up: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    down: 'bg-red-500/10 text-red-400 border-red-500/20',
    partial: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    degraded: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    unknown: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  }

  const labels = {
    up: 'Operacional',
    down: 'Fora do ar',
    partial: 'Parcial',
    degraded: 'Degradado',
    unknown: 'Desconhecido',
  }

  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-lg border ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function MonitorStatusDot({ status }: { status: string | null }) {
  const color =
    status === 'up'
      ? 'bg-emerald-500'
      : status === 'down'
        ? 'bg-red-500'
        : status === 'degraded'
          ? 'bg-amber-500'
          : 'bg-zinc-500'

  return <div className={`w-3 h-3 rounded-full ${color}`} />
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [group, setGroup] = useState<MonitorGroup | null>(null)
  const [ungroupedMonitors, setUngroupedMonitors] = useState<MonitorInGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [addMonitorsModalOpen, setAddMonitorsModalOpen] = useState(false)
  const [selectedMonitorsToAdd, setSelectedMonitorsToAdd] = useState<string[]>([])
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  useEffect(() => {
    loadGroup()
  }, [id])

  async function loadGroup() {
    try {
      const data = await api.getGroup(id)
      setGroup(data)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === 'UNAUTHORIZED') {
        router.push('/login')
        return
      }
      setError(apiError.error || 'Erro ao carregar grupo')
    } finally {
      setLoading(false)
    }
  }

  async function loadUngroupedMonitors() {
    try {
      const data = await api.getUngroupedMonitors()
      setUngroupedMonitors(data)
    } catch (err) {
      console.error('Erro ao carregar monitores:', err)
    }
  }

  async function handleDelete() {
    setDeleteModalOpen(false)
    try {
      await api.deleteGroup(id)
      router.push('/groups')
    } catch (err) {
      const apiError = err as ApiError
      setAlertModal({ open: true, message: apiError.error || 'Erro ao deletar grupo' })
    }
  }

  async function handleRemoveMonitor(monitorId: string) {
    try {
      const updated = await api.removeMonitorsFromGroup(id, [monitorId])
      setGroup(updated)
    } catch (err) {
      const apiError = err as ApiError
      setAlertModal({ open: true, message: apiError.error || 'Erro ao remover monitor' })
    }
  }

  async function handleOpenAddMonitors() {
    setSelectedMonitorsToAdd([])
    await loadUngroupedMonitors()
    setAddMonitorsModalOpen(true)
  }

  async function handleAddMonitors() {
    if (selectedMonitorsToAdd.length === 0) return

    try {
      const updated = await api.addMonitorsToGroup(id, selectedMonitorsToAdd)
      setGroup(updated)
      setAddMonitorsModalOpen(false)
    } catch (err) {
      const apiError = err as ApiError
      setAlertModal({ open: true, message: apiError.error || 'Erro ao adicionar monitores' })
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

  if (error || !group) {
    return (
      <div className="p-8">
        <Link
          href="/groups"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Grupos
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error || 'Grupo não encontrado'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/groups"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Grupos
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{group.name}</h1>
            <GroupStatusBadge status={group.status} />
          </div>
          {group.description && (
            <p className="text-zinc-400">{group.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddMonitors}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Adicionar Monitores
          </button>
          <button
            onClick={() => setDeleteModalOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Deletar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <p className="text-zinc-400 text-sm mb-1">Total</p>
          <p className="text-3xl font-bold text-white">{group.monitorsTotal}</p>
        </div>
        <div className="stat-card">
          <p className="text-zinc-400 text-sm mb-1">Online</p>
          <p className="text-3xl font-bold text-emerald-400">{group.monitorsUp}</p>
        </div>
        <div className="stat-card">
          <p className="text-zinc-400 text-sm mb-1">Offline</p>
          <p className="text-3xl font-bold text-red-400">{group.monitorsDown}</p>
        </div>
      </div>

      {/* Monitors List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Monitores</h2>
        </div>
        {group.monitors.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            Nenhum monitor neste grupo
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {group.monitors.map((monitor) => (
              <div
                key={monitor.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-zinc-800/50"
              >
                <Link
                  href={`/monitors/${monitor.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <MonitorStatusDot status={monitor.currentStatus} />
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate hover:text-orange-400 transition-colors">
                      {monitor.name}
                    </p>
                    <p className="text-zinc-500 text-sm truncate">{monitor.url}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                  {monitor.lastLatency && (
                    <span className="text-zinc-500 text-sm">{monitor.lastLatency}ms</span>
                  )}
                  <button
                    onClick={() => handleRemoveMonitor(monitor.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Remover do grupo"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Deletar Grupo"
        message={`Tem certeza que deseja deletar o grupo "${group.name}"? Os monitores não serão deletados, apenas removidos do grupo.`}
        confirmText="Deletar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* Add Monitors Modal */}
      {addMonitorsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">Adicionar Monitores</h3>
            </div>
            <div className="p-6">
              {ungroupedMonitors.length === 0 ? (
                <p className="text-zinc-500 text-center py-4">
                  Não há monitores disponíveis para adicionar.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800 border border-zinc-800 rounded-lg">
                  {ungroupedMonitors.map((monitor) => (
                    <label
                      key={monitor.id}
                      className="flex items-center gap-3 p-3 hover:bg-zinc-800/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMonitorsToAdd.includes(monitor.id)}
                        onChange={() =>
                          setSelectedMonitorsToAdd((prev) =>
                            prev.includes(monitor.id)
                              ? prev.filter((id) => id !== monitor.id)
                              : [...prev, monitor.id]
                          )
                        }
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{monitor.name}</p>
                        <p className="text-zinc-500 text-xs truncate">{monitor.url}</p>
                      </div>
                      <MonitorStatusDot status={monitor.currentStatus} />
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
              <button
                onClick={() => setAddMonitorsModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddMonitors}
                disabled={selectedMonitorsToAdd.length === 0}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Adicionar ({selectedMonitorsToAdd.length})
              </button>
            </div>
          </div>
        </div>
      )}

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
