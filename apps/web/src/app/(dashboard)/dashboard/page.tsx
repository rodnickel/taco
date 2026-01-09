'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { Monitor } from '@/lib/api'
import { useTeam } from '@/contexts/TeamContext'

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

export default function DashboardPage() {
  const router = useRouter()
  const { currentTeam, loading: teamLoading } = useTeam()
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Aguarda o TeamContext terminar de carregar e ter um team selecionado
    if (teamLoading || !currentTeam) {
      return
    }

    async function loadData() {
      try {
        const monitorsResponse = await api.getMonitors({ limit: 10 })
        setMonitors(monitorsResponse.monitors)
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('currentTeamId')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, teamLoading, currentTeam])

  const stats = {
    total: monitors.length,
    up: monitors.filter((m) => m.currentStatus === 'up').length,
    down: monitors.filter((m) => m.currentStatus === 'down').length,
    avgUptime:
      monitors.length > 0
        ? monitors.reduce((acc, m) => acc + (m.uptimePercentage || 0), 0) / monitors.length
        : 100,
  }

  if (teamLoading || loading) {
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 mt-1">Visão geral dos seus serviços</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-sm">Total de Monitors</span>
            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{stats.total}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-sm">Online</span>
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400">{stats.up}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-sm">Offline</span>
            <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-red-400">{stats.down}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-sm">Uptime Médio</span>
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{stats.avgUptime.toFixed(1)}%</div>
        </div>
      </div>

      {/* Monitors list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Monitors</h2>
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

        {monitors.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Nenhum monitor configurado</h3>
            <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
              Crie seu primeiro monitor para começar a acompanhar a disponibilidade dos seus serviços.
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
        ) : (
          <div className="divide-y divide-zinc-800">
            {monitors.map((monitor) => (
              <Link
                key={monitor.id}
                href={`/monitors/${monitor.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <StatusDot status={monitor.currentStatus} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{monitor.name}</span>
                      <StatusBadge status={monitor.currentStatus} />
                      {!monitor.active && (
                        <span className="text-xs text-zinc-500">(pausado)</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 mt-0.5">{monitor.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-zinc-400">Uptime</p>
                    <p className="font-medium text-white">
                      {monitor.uptimePercentage !== undefined
                        ? `${monitor.uptimePercentage.toFixed(2)}%`
                        : '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-400">Latência</p>
                    <p className="font-medium text-white">
                      {monitor.lastLatency !== undefined ? `${monitor.lastLatency}ms` : '-'}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}

        {monitors.length > 0 && (
          <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/50">
            <Link
              href="/monitors"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Ver todos os monitors →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
