'use client'

import { useState } from 'react'
import type { DailyUptimeData } from '@/lib/api'

interface UptimeBarProps {
  history: DailyUptimeData[]
  uptimePercentage?: number
}

export function UptimeBar({ history, uptimePercentage }: UptimeBarProps) {
  const [hoveredDay, setHoveredDay] = useState<DailyUptimeData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const getBarColor = (status: DailyUptimeData['status']) => {
    switch (status) {
      case 'up':
        return 'bg-emerald-500'
      case 'down':
        return 'bg-red-500'
      case 'degraded':
        return 'bg-amber-500'
      case 'partial':
        return 'bg-emerald-500'
      case 'no_data':
      default:
        return 'bg-zinc-700'
    }
  }

  const getStatusLabel = (status: DailyUptimeData['status']) => {
    switch (status) {
      case 'up':
        return 'Operacional'
      case 'down':
        return 'Fora do ar'
      case 'degraded':
        return 'Degradado'
      case 'partial':
        return 'Parcialmente operacional'
      case 'no_data':
      default:
        return 'Sem dados'
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleMouseEnter = (day: DailyUptimeData, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setHoveredDay(day)
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  }

  const handleMouseLeave = () => {
    setHoveredDay(null)
  }

  // Calcula uptime geral se não foi fornecido
  const calculatedUptime = uptimePercentage ?? (() => {
    const daysWithData = history.filter(d => d.totalChecks > 0)
    if (daysWithData.length === 0) return 0
    const totalUp = daysWithData.reduce((acc, d) => acc + d.upChecks, 0)
    const totalChecks = daysWithData.reduce((acc, d) => acc + d.totalChecks, 0)
    return totalChecks > 0 ? (totalUp / totalChecks) * 100 : 0
  })()

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${calculatedUptime >= 99 ? 'bg-emerald-500' : calculatedUptime >= 95 ? 'bg-amber-500' : 'bg-red-500'}`} />
          <span className="text-white font-medium">
            {history.length > 0 ? history[history.length - 1]?.status === 'up' ? 'Operacional' : 'Com problemas' : 'Aguardando dados'}
          </span>
        </div>
        <span className="text-zinc-400 text-sm">
          {calculatedUptime.toFixed(3)}% uptime
        </span>
      </div>

      {/* Bars */}
      <div className="flex gap-0.5 h-10 mb-3">
        {history.map((day, index) => (
          <div
            key={day.date}
            className={`flex-1 rounded-sm cursor-pointer transition-all hover:opacity-80 hover:scale-y-110 ${getBarColor(day.status)}`}
            onMouseEnter={(e) => handleMouseEnter(day, e)}
            onMouseLeave={handleMouseLeave}
            style={{ minWidth: '2px', maxWidth: '8px' }}
          />
        ))}
      </div>

      {/* Timeline labels */}
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{history.length} dias atrás</span>
        <span>Hoje</span>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-3 text-sm pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 8,
          }}
        >
          <div className="font-medium text-white mb-1">{formatDate(hoveredDay.date)}</div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${getBarColor(hoveredDay.status)}`} />
            <span className="text-zinc-300">{getStatusLabel(hoveredDay.status)}</span>
          </div>
          {hoveredDay.totalChecks > 0 ? (
            <>
              <div className="text-zinc-400">
                Uptime: <span className="text-white">{hoveredDay.uptimePercentage.toFixed(2)}%</span>
              </div>
              <div className="text-zinc-400">
                Checks: <span className="text-emerald-400">{hoveredDay.upChecks} up</span>
                {hoveredDay.downChecks > 0 && (
                  <>, <span className="text-red-400">{hoveredDay.downChecks} down</span></>
                )}
              </div>
              {hoveredDay.avgLatency !== null && (
                <div className="text-zinc-400">
                  Latência média: <span className="text-white">{hoveredDay.avgLatency}ms</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-zinc-500">Nenhuma verificação neste dia</div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span>Operacional</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <span>Degradado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span>Parcial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
          <span>Fora do ar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-zinc-700" />
          <span>Sem dados</span>
        </div>
      </div>
    </div>
  )
}
