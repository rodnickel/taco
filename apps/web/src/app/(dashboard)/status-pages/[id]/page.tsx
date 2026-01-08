'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { StatusPage, ApiError } from '@/lib/api'
import { ConfirmModal, AlertModal } from '@/components'

function StatusBadge({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    up: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    down: 'bg-red-500/10 text-red-400 border-red-500/20',
    degraded: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }

  const labels: Record<string, string> = {
    up: 'Online',
    down: 'Offline',
    degraded: 'Degradado',
  }

  const normalizedStatus = status || 'unknown'
  const style = styles[normalizedStatus] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  const label = labels[normalizedStatus] || 'Aguardando'

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${style}`}>
      {label}
    </span>
  )
}

export default function StatusPageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [statusPage, setStatusPage] = useState<StatusPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  useEffect(() => {
    loadStatusPage()
  }, [id])

  async function loadStatusPage() {
    try {
      const data = await api.getStatusPage(id)
      setStatusPage(data)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === 'UNAUTHORIZED') {
        router.push('/login')
        return
      }
      setError(apiError.error || 'Erro ao carregar página de status')
    } finally {
      setLoading(false)
    }
  }

  async function handleTogglePublic() {
    if (!statusPage) return

    try {
      const updated = await api.updateStatusPage(statusPage.id, { isPublic: !statusPage.isPublic })
      setStatusPage(updated)
    } catch (err) {
      const apiError = err as ApiError
      setAlertModal({ open: true, message: apiError.error || 'Erro ao atualizar página' })
    }
  }

  function handleDeleteClick() {
    setDeleteModalOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!statusPage) return
    setDeleteModalOpen(false)

    try {
      await api.deleteStatusPage(statusPage.id)
      router.push('/status-pages')
    } catch (err) {
      const apiError = err as ApiError
      setAlertModal({ open: true, message: apiError.error || 'Erro ao deletar página' })
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

  if (error || !statusPage) {
    return (
      <div className="p-8">
        <Link
          href="/status-pages"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Status Pages
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error || 'Página não encontrada'}
        </div>
      </div>
    )
  }

  const allUp = statusPage.monitors.every((m) => m.monitor.currentStatus === 'up')
  const anyDown = statusPage.monitors.some((m) => m.monitor.currentStatus === 'down')
  const overallStatus = statusPage.monitors.length === 0
    ? 'Sem monitors'
    : anyDown
    ? 'Com problemas'
    : allUp
    ? 'Todos operacionais'
    : 'Parcialmente operacional'

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/status-pages"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Status Pages
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{statusPage.name}</h1>
            {!statusPage.isPublic && (
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">privado</span>
            )}
          </div>
          <a
            href={`/status/${statusPage.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-orange-400 transition-colors"
          >
            /status/{statusPage.slug}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/status/${statusPage.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Ver página
          </a>
          <button
            onClick={handleTogglePublic}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusPage.isPublic
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-orange-600 text-white hover:bg-orange-500'
            }`}
          >
            {statusPage.isPublic ? 'Tornar privada' : 'Tornar pública'}
          </button>
          <Link
            href={`/status-pages/${statusPage.id}/edit`}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <p className="text-zinc-400 text-sm mb-1">Status geral</p>
          <p className="text-xl font-bold text-white">{overallStatus}</p>
        </div>
        <div className="stat-card">
          <p className="text-zinc-400 text-sm mb-1">Monitors</p>
          <p className="text-xl font-bold text-white">{statusPage.monitors.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-zinc-400 text-sm mb-1">Histórico</p>
          <p className="text-xl font-bold text-white">{statusPage.historyDays} dias</p>
        </div>
        <div className="stat-card">
          <p className="text-zinc-400 text-sm mb-1">Visibilidade</p>
          <p className="text-xl font-bold text-white">{statusPage.isPublic ? 'Pública' : 'Privada'}</p>
        </div>
      </div>

      {/* Monitors List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Monitors incluídos</h2>
          <Link
            href={`/status-pages/${statusPage.id}/edit`}
            className="text-sm text-orange-400 hover:text-orange-300"
          >
            Gerenciar monitors
          </Link>
        </div>

        {statusPage.monitors.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-400 mb-4">Nenhum monitor adicionado</p>
            <Link
              href={`/status-pages/${statusPage.id}/edit`}
              className="text-orange-400 hover:text-orange-300 text-sm"
            >
              Adicionar monitors
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {statusPage.monitors.map((spm) => (
              <div
                key={spm.id}
                className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      spm.monitor.currentStatus === 'up'
                        ? 'bg-emerald-500'
                        : spm.monitor.currentStatus === 'down'
                        ? 'bg-red-500'
                        : 'bg-zinc-500'
                    }`}
                  />
                  <div>
                    <p className="text-white font-medium">
                      {spm.displayName || spm.monitor.name}
                    </p>
                    <p className="text-xs text-zinc-500">{spm.monitor.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {spm.monitor.lastLatency && (
                    <span className="text-sm text-zinc-400">{spm.monitor.lastLatency}ms</span>
                  )}
                  <StatusBadge status={spm.monitor.currentStatus} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Configuração</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-zinc-500 text-sm">Cor primária</p>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-5 h-5 rounded"
                style={{ backgroundColor: statusPage.primaryColor }}
              />
              <p className="text-white font-medium">{statusPage.primaryColor}</p>
            </div>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Cor de fundo</p>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-5 h-5 rounded border border-zinc-700"
                style={{ backgroundColor: statusPage.backgroundColor }}
              />
              <p className="text-white font-medium">{statusPage.backgroundColor}</p>
            </div>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Mostrar uptime</p>
            <p className="text-white font-medium mt-1">{statusPage.showUptime ? 'Sim' : 'Não'}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Mostrar latência</p>
            <p className="text-white font-medium mt-1">{statusPage.showLatency ? 'Sim' : 'Não'}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Mostrar histórico</p>
            <p className="text-white font-medium mt-1">{statusPage.showHistory ? 'Sim' : 'Não'}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Criado em</p>
            <p className="text-white font-medium mt-1">
              {new Date(statusPage.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Deletar Status Page"
        message={`Tem certeza que deseja deletar a página "${statusPage.name}"? Esta ação não pode ser desfeita.`}
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
