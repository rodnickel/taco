'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { Incident } from '@/lib/api'

// Formata duracao em texto legivel
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`
}

// Formata data relativa
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `${diffMins}m atras`
  if (diffHours < 24) return `${diffHours}h atras`
  if (diffDays < 7) return `${diffDays}d atras`
  return date.toLocaleDateString('pt-BR')
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'acknowledged' | 'resolved'>('all')

  useEffect(() => {
    loadIncidents()
  }, [filter])

  async function loadIncidents() {
    try {
      setLoading(true)
      const data = await api.getIncidents({ status: filter, limit: 100 })
      setIncidents(data.incidents)
    } catch (err) {
      console.error('Erro ao carregar incidentes:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAcknowledge(id: string) {
    try {
      await api.acknowledgeIncident(id)
      loadIncidents()
    } catch (err) {
      console.error('Erro ao reconhecer incidente:', err)
    }
  }

  async function handleResolve(id: string) {
    try {
      await api.resolveIncident(id)
      loadIncidents()
    } catch (err) {
      console.error('Erro ao resolver incidente:', err)
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

  const ongoingCount = incidents.filter((i) => i.status === 'ongoing').length
  const acknowledgedCount = incidents.filter((i) => i.status === 'acknowledged').length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Incidentes</h1>
          <p className="text-zinc-400 mt-1">
            Gerencie os incidentes dos seus monitores
          </p>
        </div>

        {/* Contadores */}
        <div className="flex gap-4">
          {ongoingCount > 0 && (
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <span className="text-red-400 font-medium">{ongoingCount} em andamento</span>
            </div>
          )}
          {acknowledgedCount > 0 && (
            <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <span className="text-yellow-400 font-medium">{acknowledgedCount} reconhecido(s)</span>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {(['all', 'ongoing', 'acknowledged', 'resolved'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-orange-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            {status === 'all' ? 'Todos' : statusLabels[status]}
          </button>
        ))}
      </div>

      {/* Lista de Incidentes */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : incidents.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Nenhum incidente</h3>
          <p className="text-zinc-400">
            {filter === 'all'
              ? 'Todos os monitores estao funcionando normalmente.'
              : `Nenhum incidente com status "${statusLabels[filter]}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {/* Status indicator */}
                  <div
                    className={`w-3 h-3 rounded-full mt-1.5 ${statusColors[incident.status]} ${
                      incident.status === 'ongoing' ? 'animate-pulse' : ''
                    }`}
                  />

                  <div>
                    <Link
                      href={`/incidents/${incident.id}`}
                      className="text-lg font-semibold text-white hover:text-orange-400 transition-colors"
                    >
                      {incident.title}
                    </Link>

                    <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        incident.status === 'ongoing' ? 'bg-red-500/20 text-red-400' :
                        incident.status === 'acknowledged' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {statusLabels[incident.status]}
                      </span>
                      <span>Iniciado {formatRelativeTime(incident.startedAt)}</span>
                      <span>Duracao: {formatDuration(incident.duration)}</span>
                    </div>

                    {incident.cause && (
                      <p className="mt-2 text-sm text-zinc-500">
                        Causa: {incident.cause}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      <Link
                        href={`/monitors/${incident.monitor.id}`}
                        className="text-sm text-zinc-400 hover:text-orange-400 transition-colors"
                      >
                        {incident.monitor.name}
                      </Link>
                      <span className="text-zinc-600">-</span>
                      <span className="text-sm text-zinc-500 truncate max-w-xs">
                        {incident.monitor.url}
                      </span>
                    </div>

                    {incident.acknowledgedBy && (
                      <p className="mt-2 text-sm text-zinc-500">
                        Reconhecido por {incident.acknowledgedBy.name || incident.acknowledgedBy.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acoes */}
                <div className="flex items-center gap-2">
                  {incident.status === 'ongoing' && (
                    <button
                      onClick={() => handleAcknowledge(incident.id)}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {(incident.status === 'ongoing' || incident.status === 'acknowledged') && (
                    <button
                      onClick={() => handleResolve(incident.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Resolver
                    </button>
                  )}
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    Detalhes
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
