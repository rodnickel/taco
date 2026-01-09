'use client'

import { useState, useEffect, use } from 'react'
import type { PublicStatusPage, PublicSection, PublicMonitor, PublicGroup, PublicIncident, PublicMaintenance } from '@/lib/api'
import { getPublicIncidents, getPublicMaintenances } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

function StatusBadge({ status }: { status: string | null; primaryColor: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    up: { bg: '#10b98120', text: '#10b981' },
    down: { bg: '#ef444420', text: '#ef4444' },
    degraded: { bg: '#f59e0b20', text: '#f59e0b' },
    partial: { bg: '#0ea5e920', text: '#0ea5e9' },
  }

  const labels: Record<string, string> = {
    up: 'Operacional',
    down: 'Fora do ar',
    degraded: 'Degradado',
    partial: 'Parcial',
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

// Mini uptime bar component (compact version for group monitors)
function MiniUptimeBar({ history }: { history: { date: string; status: string; uptimePercentage: number }[] }) {
  // Show last 30 days only in mini version
  const recentHistory = history.slice(-30)

  const getBarColor = (status: string) => {
    switch (status) {
      case 'up':
        return '#10b981'
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

  return (
    <div className="flex gap-px h-4 w-24">
      {recentHistory.map((day) => (
        <div
          key={day.date}
          className="flex-1 rounded-sm"
          style={{ backgroundColor: getBarColor(day.status), minWidth: '2px' }}
        />
      ))}
    </div>
  )
}

// Expandable monitor row inside group
function GroupMonitorRow({
  monitor,
  statusPage,
  groupId,
  index,
}: {
  monitor: PublicMonitor
  statusPage: PublicStatusPage
  groupId: string
  index: number
}) {
  const [isDetailExpanded, setIsDetailExpanded] = useState(false)

  return (
    <div
      key={`group-${groupId}-monitor-${index}`}
      className="rounded-lg bg-zinc-800/30 overflow-hidden"
    >
      {/* Monitor row header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => statusPage.showHistory && monitor.history && monitor.history.length > 0 && setIsDetailExpanded(!isDetailExpanded)}
      >
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
          <span className="text-white">{monitor.name}</span>
          {/* Mini uptime bar */}
          {statusPage.showHistory && monitor.history && monitor.history.length > 0 && (
            <MiniUptimeBar history={monitor.history} />
          )}
        </div>
        <div className="flex items-center gap-4">
          {statusPage.showLatency && monitor.lastLatency && (
            <span className="text-sm text-zinc-500">{monitor.lastLatency}ms</span>
          )}
          {statusPage.showUptime && monitor.uptimePercentage !== undefined && (
            <span className="text-sm text-zinc-500">{monitor.uptimePercentage.toFixed(2)}%</span>
          )}
          <StatusBadge status={monitor.currentStatus} primaryColor={statusPage.primaryColor} />
          {statusPage.showHistory && monitor.history && monitor.history.length > 0 && (
            <svg
              className={`w-4 h-4 text-zinc-500 transition-transform ${isDetailExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          )}
        </div>
      </div>

      {/* Expanded detail with full uptime bar */}
      {isDetailExpanded && statusPage.showHistory && monitor.history && monitor.history.length > 0 && (
        <div className="px-4 pb-4 pt-2 border-t border-zinc-700/50">
          <UptimeBar history={monitor.history} primaryColor={statusPage.primaryColor} />
        </div>
      )}
    </div>
  )
}

// Component for rendering an expandable group
function GroupCard({
  group,
  statusPage,
}: {
  group: PublicGroup
  statusPage: PublicStatusPage
}) {
  const [isExpanded, setIsExpanded] = useState(group.isExpanded)

  const statusColors: Record<string, string> = {
    up: '#10b981',
    down: '#ef4444',
    partial: '#0ea5e9',
    degraded: '#f59e0b',
    unknown: '#71717a',
  }

  const statusColor = statusColors[group.status] || statusColors.unknown

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      {/* Group header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
        style={{ backgroundColor: statusPage.backgroundColor }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <div className="text-left">
            <h3 className="text-white font-semibold">{group.name}</h3>
            {group.description && (
              <p className="text-zinc-500 text-sm mt-0.5">{group.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-2">
            <span className="text-sm text-zinc-400">
              {group.monitorsUp}/{group.monitorsTotal} online
            </span>
          </div>
          <StatusBadge status={group.status} primaryColor={statusPage.primaryColor} />
          <svg
            className={`w-5 h-5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Expanded content - monitors list */}
      {isExpanded && group.monitors.length > 0 && (
        <div className="border-t border-zinc-800 p-4 space-y-3" style={{ backgroundColor: statusPage.backgroundColor }}>
          {group.monitors.map((monitor, index) => (
            <GroupMonitorRow
              key={`group-${group.id}-monitor-${index}`}
              monitor={monitor}
              statusPage={statusPage}
              groupId={group.id}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Helpers for formatting time
function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `há ${diffMins}min`
  if (diffHours < 24) return `há ${diffHours}h`
  if (diffDays < 7) return `há ${diffDays}d`
  return date.toLocaleDateString('pt-BR')
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`
}

function formatMaintenanceTime(startTime: string, endTime: string, status: string) {
  const start = new Date(startTime)
  const end = new Date(endTime)

  if (status === 'ongoing') {
    return `Termina ${end.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}`
  }

  return `${start.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

// Component for maintenance banner
function MaintenanceBanner({ maintenances, primaryColor }: { maintenances: PublicMaintenance[]; primaryColor: string }) {
  const ongoingMaintenances = maintenances.filter(m => m.status === 'ongoing')
  const upcomingMaintenances = maintenances.filter(m => m.status === 'upcoming')

  if (ongoingMaintenances.length === 0 && upcomingMaintenances.length === 0) {
    return null
  }

  return (
    <div className="mb-8 space-y-3">
      {ongoingMaintenances.map(m => (
        <div
          key={m.id}
          className="rounded-xl p-4 border border-blue-500/30 bg-blue-500/10"
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
            </svg>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-medium">Manutenção em andamento</span>
                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">Ativo</span>
              </div>
              <p className="text-white font-medium mt-1">{m.name}</p>
              {m.description && <p className="text-zinc-400 text-sm mt-1">{m.description}</p>}
              <p className="text-zinc-500 text-sm mt-2">
                {formatMaintenanceTime(m.startTime, m.endTime, m.status)}
                {m.monitors.length > 0 && (
                  <span className="ml-2">
                    • Afeta: {m.monitors.map(mon => mon.name).join(', ')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      ))}

      {upcomingMaintenances.map(m => (
        <div
          key={m.id}
          className="rounded-xl p-4 border border-yellow-500/30 bg-yellow-500/10"
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-medium">Manutenção agendada</span>
              </div>
              <p className="text-white font-medium mt-1">{m.name}</p>
              {m.description && <p className="text-zinc-400 text-sm mt-1">{m.description}</p>}
              <p className="text-zinc-500 text-sm mt-2">
                {formatMaintenanceTime(m.startTime, m.endTime, m.status)}
                {m.monitors.length > 0 && (
                  <span className="ml-2">
                    • Afeta: {m.monitors.map(mon => mon.name).join(', ')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Component for incident status badge
function IncidentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    ongoing: { bg: '#ef444420', text: '#ef4444', label: 'Em andamento' },
    acknowledged: { bg: '#f59e0b20', text: '#f59e0b', label: 'Reconhecido' },
    resolved: { bg: '#10b98120', text: '#10b981', label: 'Resolvido' },
  }

  const style = styles[status] || styles.ongoing

  return (
    <span
      className="px-2 py-0.5 text-xs font-medium rounded-full"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  )
}

// Component for incidents section
function IncidentsSection({
  incidents,
  total,
  loading,
  onLoadMore,
  hasMore,
}: {
  incidents: PublicIncident[]
  total: number
  loading: boolean
  onLoadMore: () => void
  hasMore: boolean
}) {
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'resolved'>('all')
  const [expandedIncidents, setExpandedIncidents] = useState<Set<string>>(new Set())

  const filteredIncidents = filter === 'all'
    ? incidents
    : incidents.filter(i => filter === 'ongoing' ? ['ongoing', 'acknowledged'].includes(i.status) : i.status === 'resolved')

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedIncidents)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedIncidents(newSet)
  }

  return (
    <div className="mt-12 pt-8 border-t border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">
          Incidentes
          {total > 0 && <span className="text-zinc-500 text-base font-normal ml-2">({total})</span>}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('ongoing')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === 'ongoing' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Em andamento
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === 'resolved' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Resolvidos
          </button>
        </div>
      </div>

      {filteredIncidents.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          {filter === 'all'
            ? 'Nenhum incidente registrado'
            : filter === 'ongoing'
            ? 'Nenhum incidente em andamento'
            : 'Nenhum incidente resolvido'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => (
            <div
              key={incident.id}
              className="rounded-xl border border-zinc-800 overflow-hidden"
            >
              <button
                onClick={() => toggleExpanded(incident.id)}
                className="w-full p-4 flex items-start justify-between text-left hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{
                      backgroundColor: incident.status === 'resolved'
                        ? '#10b981'
                        : incident.status === 'acknowledged'
                        ? '#f59e0b'
                        : '#ef4444',
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">{incident.title}</span>
                      <IncidentStatusBadge status={incident.status} />
                    </div>
                    <p className="text-zinc-500 text-sm mt-1">
                      {incident.monitor.name} • {formatRelativeTime(incident.startedAt)}
                      {incident.duration > 0 && (
                        <span className="ml-2">• Duração: {formatDuration(incident.duration)}</span>
                      )}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-zinc-500 transition-transform flex-shrink-0 mt-2 ${expandedIncidents.has(incident.id) ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {expandedIncidents.has(incident.id) && (
                <div className="px-4 pb-4 pt-2 border-t border-zinc-800">
                  {incident.cause && (
                    <div className="mb-4">
                      <span className="text-zinc-500 text-sm">Causa:</span>
                      <p className="text-zinc-300 text-sm mt-1">{incident.cause}</p>
                    </div>
                  )}

                  {incident.updates.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-sm">Atualizações:</span>
                      <div className="mt-2 space-y-2">
                        {incident.updates.map((update) => (
                          <div key={update.id} className="flex gap-3 text-sm">
                            <span className="text-zinc-500 flex-shrink-0">{formatRelativeTime(update.createdAt)}</span>
                            <p className="text-zinc-300">{update.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <button
          onClick={onLoadMore}
          className="w-full mt-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Carregar mais incidentes
        </button>
      )}

      {loading && (
        <div className="flex justify-center mt-4">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

export default function PublicStatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [statusPage, setStatusPage] = useState<PublicStatusPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Incidents state
  const [incidents, setIncidents] = useState<PublicIncident[]>([])
  const [incidentsTotal, setIncidentsTotal] = useState(0)
  const [incidentsLoading, setIncidentsLoading] = useState(false)
  const [incidentsOffset, setIncidentsOffset] = useState(0)
  const INCIDENTS_LIMIT = 10

  // Maintenances state
  const [maintenances, setMaintenances] = useState<PublicMaintenance[]>([])

  useEffect(() => {
    loadStatusPage()
  }, [slug])

  useEffect(() => {
    if (statusPage) {
      loadIncidents()
      loadMaintenances()
    }
  }, [statusPage])

  async function loadIncidents(append = false) {
    try {
      setIncidentsLoading(true)
      const offset = append ? incidentsOffset : 0
      const data = await getPublicIncidents(slug, { limit: INCIDENTS_LIMIT, offset })

      if (append) {
        setIncidents(prev => [...prev, ...data.incidents])
      } else {
        setIncidents(data.incidents)
      }
      setIncidentsTotal(data.total)
      setIncidentsOffset(offset + INCIDENTS_LIMIT)
    } catch (err) {
      console.error('Error loading incidents:', err)
    } finally {
      setIncidentsLoading(false)
    }
  }

  async function loadMaintenances() {
    try {
      const data = await getPublicMaintenances(slug)
      setMaintenances(data.maintenances)
    } catch (err) {
      console.error('Error loading maintenances:', err)
    }
  }

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

  // Get all monitors (from sections, standalone, and groups)
  const allMonitors = [
    ...statusPage.monitors,
    ...(statusPage.sections?.flatMap((s) => s.monitors) || []),
    ...(statusPage.groups?.flatMap((g) => g.monitors) || []),
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

  // Sort sections and groups by displayOrder
  const sortedSections = [...(statusPage.sections || [])].sort((a, b) => a.displayOrder - b.displayOrder)
  const sortedGroups = [...(statusPage.groups || [])].sort((a, b) => a.displayOrder - b.displayOrder)

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

        {/* Maintenance banners */}
        <MaintenanceBanner maintenances={maintenances} primaryColor={statusPage.primaryColor} />

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

        {/* Groups */}
        {sortedGroups.length > 0 && (
          <div className="space-y-4 mb-8">
            {sortedGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
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

        {/* Incidents section */}
        <IncidentsSection
          incidents={incidents}
          total={incidentsTotal}
          loading={incidentsLoading}
          onLoadMore={() => loadIncidents(true)}
          hasMore={incidents.length < incidentsTotal}
        />

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
