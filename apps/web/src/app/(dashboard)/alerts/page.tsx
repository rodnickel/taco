'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { AlertChannel, ApiError } from '@/lib/api'
import { ConfirmModal, AlertModal } from '@/components'

function ChannelTypeIcon({ type }: { type: AlertChannel['type'] }) {
  if (type === 'email') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    )
  }
  if (type === 'webhook') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    )
  }
  // slack
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  )
}

function ChannelTypeBadge({ type }: { type: AlertChannel['type'] }) {
  const styles = {
    email: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    webhook: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    slack: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }

  const labels = {
    email: 'Email',
    webhook: 'Webhook',
    slack: 'Slack',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border ${styles[type]}`}>
      <ChannelTypeIcon type={type} />
      {labels[type]}
    </span>
  )
}

export default function AlertsPage() {
  const router = useRouter()
  const [channels, setChannels] = useState<AlertChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; channel: AlertChannel | null }>({ open: false, channel: null })
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  useEffect(() => {
    loadChannels()
  }, [])

  async function loadChannels() {
    try {
      const data = await api.getAlertChannels()
      setChannels(data.channels)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === 'UNAUTHORIZED') {
        router.push('/login')
        return
      }
      setError(apiError.error || 'Erro ao carregar canais de alerta')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(channel: AlertChannel) {
    try {
      const updated = await api.updateAlertChannel(channel.id, { active: !channel.active })
      setChannels(channels.map(c => c.id === channel.id ? updated : c))
    } catch (err) {
      const apiError = err as ApiError
      setAlertModal({ open: true, message: apiError.error || 'Erro ao atualizar canal' })
    }
  }

  function handleDeleteClick(channel: AlertChannel) {
    setDeleteModal({ open: true, channel })
  }

  async function handleDeleteConfirm() {
    if (!deleteModal.channel) return
    const channelToDelete = deleteModal.channel
    setDeleteModal({ open: false, channel: null })

    try {
      await api.deleteAlertChannel(channelToDelete.id)
      setChannels(channels.filter(c => c.id !== channelToDelete.id))
    } catch (err) {
      const apiError = err as ApiError
      setAlertModal({ open: true, message: apiError.error || 'Erro ao deletar canal' })
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Canais de Alerta</h1>
          <p className="text-zinc-400 mt-1">Configure como você quer receber notificações</p>
        </div>
        <Link
          href="/alerts/new"
          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Novo Canal
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Empty state */}
      {channels.length === 0 && !error && (
        <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
          <svg className="w-12 h-12 mx-auto text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">Nenhum canal configurado</h3>
          <p className="text-zinc-400 mb-6">Configure um canal para receber alertas quando seus monitores ficarem offline.</p>
          <Link
            href="/alerts/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Criar primeiro canal
          </Link>
        </div>
      )}

      {/* Channels list */}
      {channels.length > 0 && (
        <div className="space-y-3">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    channel.type === 'email' ? 'bg-blue-500/10 text-blue-400' :
                    channel.type === 'webhook' ? 'bg-purple-500/10 text-purple-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>
                    <ChannelTypeIcon type={channel.type} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-white">{channel.name}</h3>
                      <ChannelTypeBadge type={channel.type} />
                      {!channel.active && (
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">inativo</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">
                      {channel.type === 'email' && (channel.config as { to: string }).to}
                      {channel.type === 'webhook' && (channel.config as { url: string }).url}
                      {channel.type === 'slack' && 'Canal do Slack configurado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(channel)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      channel.active
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        : 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/30'
                    }`}
                  >
                    {channel.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <Link
                    href={`/alerts/${channel.id}/edit`}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDeleteClick(channel)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Deletar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        title="Deletar Canal"
        message={`Tem certeza que deseja deletar o canal "${deleteModal.channel?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Deletar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ open: false, channel: null })}
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
