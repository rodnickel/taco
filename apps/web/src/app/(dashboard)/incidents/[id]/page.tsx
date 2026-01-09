'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { Incident } from '@/lib/api'

// Formata duracao em texto legivel
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} segundos`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} minutos`
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} horas`
  }
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  return hours > 0 ? `${days}d ${hours}h` : `${days} dias`
}

// Formata data completa
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function IncidentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    loadIncident()
  }, [params.id])

  async function loadIncident() {
    try {
      setLoading(true)
      const data = await api.getIncident(params.id as string)
      setIncident(data)
    } catch (err) {
      console.error('Erro ao carregar incidente:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAcknowledge() {
    if (!incident) return
    try {
      setUpdating(true)
      await api.acknowledgeIncident(incident.id)
      loadIncident()
    } catch (err) {
      console.error('Erro ao reconhecer incidente:', err)
    } finally {
      setUpdating(false)
    }
  }

  async function handleResolve() {
    if (!incident) return
    try {
      setUpdating(true)
      await api.resolveIncident(incident.id)
      loadIncident()
    } catch (err) {
      console.error('Erro ao resolver incidente:', err)
    } finally {
      setUpdating(false)
    }
  }

  async function handleAddUpdate() {
    if (!incident || !newMessage.trim()) return
    try {
      setUpdating(true)
      await api.addIncidentUpdate(incident.id, newMessage)
      setNewMessage('')
      loadIncident()
    } catch (err) {
      console.error('Erro ao adicionar update:', err)
    } finally {
      setUpdating(false)
    }
  }

  const statusColors = {
    ongoing: 'bg-red-500',
    acknowledged: 'bg-yellow-500',
    resolved: 'bg-green-500',
  }

  const statusLabels = {
    ongoing: 'Em andamento',
    acknowledged: 'Reconhecido',
    resolved: 'Resolvido',
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="p-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <h3 className="text-lg font-medium text-white mb-2">Incidente nao encontrado</h3>
          <Link href="/incidents" className="text-orange-400 hover:text-orange-300">
            Voltar para incidentes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Incidentes
        </Link>
      </div>

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Status icon */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                incident.status === 'ongoing' ? 'bg-red-500/20' :
                incident.status === 'acknowledged' ? 'bg-yellow-500/20' :
                'bg-green-500/20'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full ${statusColors[incident.status]} ${
                  incident.status === 'ongoing' ? 'animate-pulse' : ''
                }`}
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">{incident.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  incident.status === 'ongoing' ? 'bg-red-500/20 text-red-400' :
                  incident.status === 'acknowledged' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {statusLabels[incident.status]}
                </span>
                <span className="text-zinc-400">
                  {formatDateTime(incident.startedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Acoes */}
          <div className="flex items-center gap-2">
            {incident.status === 'ongoing' && (
              <button
                onClick={handleAcknowledge}
                disabled={updating}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                Acknowledge
              </button>
            )}
            {incident.status !== 'resolved' && (
              <button
                onClick={handleResolve}
                disabled={updating}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                Resolver
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm text-zinc-500 mb-1">Causa</p>
          <p className="text-white font-medium">{incident.cause || 'Nao especificada'}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm text-zinc-500 mb-1">Duracao</p>
          <p className="text-white font-medium">
            {incident.status === 'resolved' ? formatDuration(incident.duration) : 'Em andamento'}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm text-zinc-500 mb-1">Monitor</p>
          <Link
            href={`/monitors/${incident.monitor.id}`}
            className="text-orange-400 hover:text-orange-300 font-medium"
          >
            {incident.monitor.name}
          </Link>
        </div>
      </div>

      {/* URL verificada */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
        <p className="text-sm text-zinc-500 mb-1">URL verificada</p>
        <p className="text-zinc-300 font-mono text-sm">{incident.monitor.url}</p>
      </div>

      {/* Acknowledge info */}
      {incident.acknowledgedBy && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <p className="text-sm text-zinc-500 mb-1">Reconhecido por</p>
          <p className="text-white">
            {incident.acknowledgedBy.name || incident.acknowledgedBy.email}
            {incident.acknowledgedAt && (
              <span className="text-zinc-500 ml-2">em {formatDateTime(incident.acknowledgedAt)}</span>
            )}
          </p>
        </div>
      )}

      {/* Adicionar update */}
      {incident.status !== 'resolved' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Adicionar atualizacao</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Descreva o que esta sendo feito..."
              className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={handleAddUpdate}
              disabled={updating || !newMessage.trim()}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Timeline de updates */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Historico</h3>

        {incident.updates && incident.updates.length > 0 ? (
          <div className="relative">
            {/* Linha vertical */}
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-zinc-700" />

            <div className="space-y-6">
              {incident.updates.map((update, index) => (
                <div key={update.id} className="flex gap-4 relative">
                  {/* Ponto na timeline */}
                  <div
                    className={`w-4 h-4 rounded-full z-10 ${
                      update.status === 'ongoing' ? 'bg-red-500' :
                      update.status === 'acknowledged' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                  />

                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-sm font-medium ${
                        update.status === 'ongoing' ? 'text-red-400' :
                        update.status === 'acknowledged' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {statusLabels[update.status as keyof typeof statusLabels] || update.status}
                      </span>
                      <span className="text-sm text-zinc-500">
                        {formatDateTime(update.createdAt)}
                      </span>
                    </div>
                    <p className="text-zinc-300">{update.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-zinc-500">Nenhuma atualizacao ainda.</p>
        )}
      </div>
    </div>
  )
}
