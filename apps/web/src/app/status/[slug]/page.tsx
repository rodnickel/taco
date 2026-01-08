'use client'

import { useState, useEffect, use } from 'react'
import type { PublicStatusPage, PublicSection, PublicMonitor } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

function StatusBadge({ status }: { status: string | null; primaryColor: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    up: { bg: '#10b98120', text: '#10b981' },
    down: { bg: '#ef444420', text: '#ef4444' },
    degraded: { bg: '#f59e0b20', text: '#f59e0b' },
  }

  const labels: Record<string, string> = {
    up: 'Operacional',
    down: 'Fora do ar',
    degraded: 'Degradado',
  }

  const normalizedStatus = status || 'unknown'
  const style = styles[normalizedStatus] || { bg: '#71717a20', text: '#71717a' }
  const label = labels[normalizedStatus] || 'Verificando'

  return (
    <span
      className="px-3 py-1 text-sm font-medium rounded-full"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {label}
    </span>
  )
}

function UptimeBar({ history, primaryColor }: { history: { date: string; status: string; uptimePercentage: number }[]; primaryColor: string }) {
  const [hoveredDay, setHoveredDay] = useState<{ date: string; status: string; uptimePercentage: number } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const getBarColor = (status: string) => {
    switch (status) {
      case 'up':
        return '#10b981' // emerald-500 - verde classico para OK
      case 'down':
        return '#ef4444'
      case 'degraded':
        return '#f59e0b'
      case 'partial':
        return '#10b981'
      case 'no_data':
      default:
        return '#3f3f46'
    }
  }

  const handleMouseEnter = (day: { date: string; status: string; uptimePercentage: number }, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setHoveredDay(day)
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div>
      <div className="flex gap-0.5 h-8">
        {history.map((day) => (
          <div
            key={day.date}
            className="flex-1 rounded-sm cursor-pointer transition-opacity hover:opacity-80"
            style={{ backgroundColor: getBarColor(day.status), minWidth: '2px', maxWidth: '8px' }}
            onMouseEnter={(e) => handleMouseEnter(day, e)}
            onMouseLeave={() => setHoveredDay(null)}
          />
        ))}
      </div>

      <div className="flex justify-between text-xs text-zinc-500 mt-2">
        <span>{history.length} dias atrás</span>
        <span>Hoje</span>
      </div>

      {hoveredDay && (
        <div
          className="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-3 text-sm pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 8,
          }}
        >
          <div className="font-medium text-white mb-1">{formatDate(hoveredDay.date)}</div>
          <div className="text-zinc-400">
            Uptime: <span className="text-white">{hoveredDay.uptimePercentage.toFixed(2)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Component for rendering a single monitor card
function MonitorCard({
  monitor,
  statusPage,
}: {
  monitor: PublicMonitor
  statusPage: PublicStatusPage
}) {
  return (
    <div
      className="rounded-xl p-6 border border-zinc-800"
      style={{ backgroundColor: statusPage.backgroundColor }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: monitor.currentStatus === 'up'
                ? '#10b981'
                : monitor.currentStatus === 'down'
                ? '#ef4444'
                : '#71717a',
            }}
          />
          <span className="text-white font-medium">{monitor.name}</span>
        </div>
        <div className="flex items-center gap-4">
          {statusPage.showLatency && monitor.lastLatency && (
            <span className="text-sm text-zinc-400">{monitor.lastLatency}ms</span>
          )}
          {statusPage.showUptime && monitor.uptimePercentage !== undefined && (
            <span className="text-sm text-zinc-400">{monitor.uptimePercentage.toFixed(2)}%</span>
          )}
          <StatusBadge status={monitor.currentStatus} primaryColor={statusPage.primaryColor} />
        </div>
      </div>

      {statusPage.showHistory && monitor.history && monitor.history.length > 0 && (
        <UptimeBar history={monitor.history} primaryColor={statusPage.primaryColor} />
      )}
    </div>
  )
}

// Component for rendering a section with its monitors
function SectionGroup({
  section,
  statusPage,
}: {
  section: PublicSection
  statusPage: PublicStatusPage
}) {
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3 pt-4">
        <h2 className="text-lg font-semibold text-white">{section.name}</h2>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      {/* Section monitors */}
      <div className="space-y-4">
        {section.monitors.map((monitor, index) => (
          <MonitorCard
            key={`${section.id}-${index}`}
            monitor={monitor}
            statusPage={statusPage}
          />
        ))}
      </div>
    </div>
  )
}

export default function PublicStatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [statusPage, setStatusPage] = useState<PublicStatusPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStatusPage()
  }, [slug])

  async function loadStatusPage() {
    try {
      const response = await fetch(`${API_URL}/public/status/${slug}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Página de status não encontrada')
        } else {
          setError('Erro ao carregar página de status')
        }
        return
      }

      const data = await response.json()
      setStatusPage(data)
    } catch {
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400">Carregando...</span>
        </div>
      </div>
    )
  }

  if (error || !statusPage) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Página não encontrada</h1>
          <p className="text-zinc-400">{error || 'A página de status solicitada não existe'}</p>
        </div>
      </div>
    )
  }

  // Get all monitors (from sections and standalone)
  const allMonitors = [
    ...statusPage.monitors,
    ...(statusPage.sections?.flatMap((s) => s.monitors) || []),
  ]

  const allUp = allMonitors.every((m) => m.currentStatus === 'up')
  const anyDown = allMonitors.some((m) => m.currentStatus === 'down')
  const overallStatus = allMonitors.length === 0
    ? 'Sem dados'
    : anyDown
    ? 'Alguns sistemas com problemas'
    : allUp
    ? 'Todos os sistemas operacionais'
    : 'Alguns sistemas parcialmente operacionais'

  const overallUptime = allMonitors.length > 0
    ? allMonitors.reduce((acc, m) => acc + (m.uptimePercentage || 0), 0) / allMonitors.length
    : 0

  // Sort sections by displayOrder
  const sortedSections = [...(statusPage.sections || [])].sort((a, b) => a.displayOrder - b.displayOrder)

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: statusPage.backgroundColor }}
    >
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          {statusPage.logoUrl && (
            <img
              src={statusPage.logoUrl}
              alt={statusPage.name}
              className="h-12 mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-white mb-2">{statusPage.name}</h1>
          {statusPage.description && (
            <p className="text-zinc-400">{statusPage.description}</p>
          )}
        </div>

        {/* Overall Status */}
        <div
          className="rounded-2xl p-6 mb-8 border"
          style={{
            backgroundColor: statusPage.backgroundColor,
            borderColor: anyDown ? '#ef444440' : allUp ? '#10b98140' : '#f59e0b40',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-4 h-4 rounded-full animate-pulse"
                style={{
                  backgroundColor: anyDown ? '#ef4444' : allUp ? '#10b981' : '#f59e0b',
                }}
              />
              <div>
                <p className="text-xl font-semibold text-white">{overallStatus}</p>
                {statusPage.showUptime && (
                  <p className="text-sm text-zinc-400">
                    Uptime geral: {overallUptime.toFixed(2)}%
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-zinc-500">
              Última atualização: {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Monitors without section (standalone monitors) */}
        {statusPage.monitors.length > 0 && (
          <div className="space-y-4 mb-8">
            {statusPage.monitors.map((monitor, index) => (
              <MonitorCard
                key={`standalone-${index}`}
                monitor={monitor}
                statusPage={statusPage}
              />
            ))}
          </div>
        )}

        {/* Sections with their monitors */}
        {sortedSections.length > 0 && (
          <div className="space-y-6">
            {sortedSections.map((section) => (
              <SectionGroup
                key={section.id}
                section={section}
                statusPage={statusPage}
              />
            ))}
          </div>
        )}

        {allMonitors.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-400">Nenhum monitor configurado</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-zinc-800">
          <p className="text-sm text-zinc-500">
            Powered by <span className="font-display font-semibold" style={{ color: statusPage.primaryColor }}>Taco</span>
          </p>
        </div>
      </div>
    </div>
  )
}
