import { prisma } from '../../lib/prisma.js'
import {
  scheduleMonitorCheck,
  unscheduleMonitorCheck,
} from '../../workers/monitor-check.worker.js'
import {
  checkMonitorLimit,
  checkIntervalAllowed,
  getHistoryDays,
} from '../plans/limits.service.js'
import type {
  CreateMonitorInput,
  UpdateMonitorInput,
  ListMonitorsQuery,
  MonitorWithStatus,
  RequestHeader,
} from './monitors.schema.js'

// ============================================
// Serviço de Monitors - CRUD e operações
// Atualizado para usar teamId em vez de userId
// ============================================

export async function createMonitor(teamId: string, data: CreateMonitorInput) {
  // Verifica limite de monitores do plano
  const limitCheck = await checkMonitorLimit(teamId)
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.message || 'Limite de monitores atingido')
  }

  // Verifica se o intervalo é permitido pelo plano
  const intervalCheck = await checkIntervalAllowed(teamId, data.intervalSeconds)
  if (!intervalCheck.allowed) {
    throw new Error(intervalCheck.message || `Intervalo mínimo permitido: ${intervalCheck.minInterval}s`)
  }

  // Converte requestHeaders para formato JSON aceito pelo Prisma
  const { requestHeaders, escalationPolicyId, groupId, ...restData } = data
  const monitor = await prisma.monitor.create({
    data: {
      ...restData,
      teamId,
      requestHeaders: requestHeaders as object | undefined,
      escalationPolicyId: escalationPolicyId ?? null,
      groupId: groupId ?? null,
    },
  })

  // Agenda verificação se o monitor estiver ativo
  if (monitor.active) {
    await scheduleMonitorCheck(monitor.id)
  }

  return monitor
}

export async function findAllMonitors(teamId: string, query: ListMonitorsQuery) {
  const where: { teamId: string; active?: boolean } = { teamId }

  if (query.active !== undefined) {
    where.active = query.active === 'true'
  }

  const [monitors, total] = await Promise.all([
    prisma.monitor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.monitor.count({ where }),
  ])

  return {
    monitors,
    total,
    limit: query.limit,
    offset: query.offset,
  }
}

export async function findMonitorById(teamId: string, id: string) {
  const monitor = await prisma.monitor.findFirst({
    where: { id, teamId },
  })

  return monitor
}

export async function updateMonitor(
  teamId: string,
  id: string,
  data: UpdateMonitorInput
) {
  // Verifica se o monitor pertence ao time
  const existing = await prisma.monitor.findFirst({
    where: { id, teamId },
  })

  if (!existing) {
    return null
  }

  // Verifica se o novo intervalo é permitido pelo plano
  if (data.intervalSeconds !== undefined) {
    const intervalCheck = await checkIntervalAllowed(teamId, data.intervalSeconds)
    if (!intervalCheck.allowed) {
      throw new Error(intervalCheck.message || `Intervalo mínimo permitido: ${intervalCheck.minInterval}s`)
    }
  }

  // Converte requestHeaders, escalationPolicyId e groupId para formato Prisma
  const { requestHeaders, escalationPolicyId, groupId, ...restData } = data
  const updateData: Record<string, unknown> = { ...restData }
  if (requestHeaders !== undefined) {
    updateData.requestHeaders = requestHeaders as object | null
  }
  if (escalationPolicyId !== undefined) {
    updateData.escalationPolicyId = escalationPolicyId ?? null
  }
  if (groupId !== undefined) {
    updateData.groupId = groupId ?? null
  }

  const monitor = await prisma.monitor.update({
    where: { id },
    data: updateData,
  })

  // Atualiza agendamento baseado no status
  if (data.active !== undefined || data.intervalSeconds !== undefined) {
    await unscheduleMonitorCheck(id)
    if (monitor.active) {
      // Executa imediatamente se o monitor foi ativado (estava inativo antes)
      const wasReactivated = data.active === true && existing.active === false
      await scheduleMonitorCheck(id, wasReactivated)
    }
  }

  return monitor
}

export async function deleteMonitor(teamId: string, id: string) {
  // Verifica se o monitor pertence ao time
  const existing = await prisma.monitor.findFirst({
    where: { id, teamId },
  })

  if (!existing) {
    return false
  }

  // Remove do agendamento
  await unscheduleMonitorCheck(id)

  await prisma.monitor.delete({
    where: { id },
  })

  return true
}

export async function getMonitorWithStatus(
  teamId: string,
  id: string
): Promise<MonitorWithStatus | null> {
  // Obtém o limite de dias de histórico do plano para calcular uptime
  const historyDays = await getHistoryDays(teamId)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - historyDays)
  startDate.setHours(0, 0, 0, 0)

  const monitor = await prisma.monitor.findFirst({
    where: { id, teamId },
    include: {
      checks: {
        where: {
          checkedAt: { gte: startDate },
        },
        orderBy: { checkedAt: 'desc' },
      },
    },
  })

  if (!monitor) {
    return null
  }

  // Calcula o status atual baseado no último check
  const lastCheck = monitor.checks[0]
  let currentStatus: 'up' | 'down' | 'degraded' | 'unknown' = 'unknown'

  if (lastCheck) {
    if (lastCheck.status === 'up') {
      // Verifica se a latência está degradada (> 2x timeout)
      if (lastCheck.latency && lastCheck.latency > monitor.timeout * 1000) {
        currentStatus = 'degraded'
      } else {
        currentStatus = 'up'
      }
    } else {
      currentStatus = 'down'
    }
  }

  // Calcula uptime percentage baseado no período do plano
  const totalChecks = monitor.checks.length
  const upChecks = monitor.checks.filter((c) => c.status === 'up').length
  const uptimePercentage = totalChecks > 0 ? (upChecks / totalChecks) * 100 : undefined

  // Remove os checks do retorno para não sobrecarregar
  const { checks, requestHeaders, ...monitorData } = monitor

  return {
    ...monitorData,
    requestHeaders: requestHeaders as RequestHeader[] | null,
    currentStatus,
    lastCheck: lastCheck?.checkedAt,
    lastLatency: lastCheck?.latency ?? undefined,
    uptimePercentage,
  }
}

export async function findAllMonitorsWithStatus(
  teamId: string,
  query: ListMonitorsQuery
): Promise<{ monitors: MonitorWithStatus[]; total: number; limit: number; offset: number }> {
  // Obtém o limite de dias de histórico do plano para calcular uptime
  const historyDays = await getHistoryDays(teamId)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - historyDays)
  startDate.setHours(0, 0, 0, 0)

  const where: { teamId: string; active?: boolean } = { teamId }

  if (query.active !== undefined) {
    where.active = query.active === 'true'
  }

  const [monitors, total] = await Promise.all([
    prisma.monitor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: query.offset,
      include: {
        checks: {
          where: {
            checkedAt: { gte: startDate },
          },
          orderBy: { checkedAt: 'desc' },
        },
      },
    }),
    prisma.monitor.count({ where }),
  ])

  const monitorsWithStatus: MonitorWithStatus[] = monitors.map((monitor) => {
    const lastCheck = monitor.checks[0]
    let currentStatus: 'up' | 'down' | 'degraded' | 'unknown' = 'unknown'

    if (lastCheck) {
      if (lastCheck.status === 'up') {
        if (lastCheck.latency && lastCheck.latency > monitor.timeout * 1000) {
          currentStatus = 'degraded'
        } else {
          currentStatus = 'up'
        }
      } else {
        currentStatus = 'down'
      }
    }

    const totalChecks = monitor.checks.length
    const upChecks = monitor.checks.filter((c) => c.status === 'up').length
    const uptimePercentage = totalChecks > 0 ? (upChecks / totalChecks) * 100 : undefined

    const { checks, requestHeaders, ...monitorData } = monitor

    return {
      ...monitorData,
      requestHeaders: requestHeaders as RequestHeader[] | null,
      currentStatus,
      lastCheck: lastCheck?.checkedAt,
      lastLatency: lastCheck?.latency ?? undefined,
      uptimePercentage,
    }
  })

  return {
    monitors: monitorsWithStatus,
    total,
    limit: query.limit,
    offset: query.offset,
  }
}

// Tipo para o histórico diário
export interface DailyUptimeData {
  date: string // YYYY-MM-DD
  totalChecks: number
  upChecks: number
  downChecks: number
  avgLatency: number | null
  uptimePercentage: number
  status: 'up' | 'down' | 'degraded' | 'no_data'
}

export async function getMonitorHistory(
  teamId: string,
  monitorId: string,
  days?: number
): Promise<DailyUptimeData[] | null> {
  // Verifica se o monitor pertence ao time
  const monitor = await prisma.monitor.findFirst({
    where: { id: monitorId, teamId },
  })

  if (!monitor) {
    return null
  }

  // Obtém o limite de dias de histórico do plano
  const maxHistoryDays = await getHistoryDays(teamId)

  // Usa o menor valor entre o solicitado e o permitido pelo plano
  const effectiveDays = days ? Math.min(days, maxHistoryDays) : maxHistoryDays

  // Data de início (X dias atrás)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - effectiveDays)
  startDate.setHours(0, 0, 0, 0)

  // Busca todos os checks do período
  const checks = await prisma.check.findMany({
    where: {
      monitorId,
      checkedAt: {
        gte: startDate,
      },
    },
    orderBy: { checkedAt: 'asc' },
    select: {
      status: true,
      latency: true,
      checkedAt: true,
    },
  })

  // Agrupa por dia (usando timezone local)
  const dailyData = new Map<string, { up: number; down: number; latencies: number[] }>()

  // Função para formatar data como YYYY-MM-DD em timezone local
  const formatDateLocal = (d: Date): string => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Inicializa todos os dias do período
  for (let i = 0; i < effectiveDays; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (effectiveDays - 1 - i))
    const dateKey = formatDateLocal(date)
    dailyData.set(dateKey, { up: 0, down: 0, latencies: [] })
  }

  // Processa os checks
  for (const check of checks) {
    const dateKey = formatDateLocal(check.checkedAt)
    const dayData = dailyData.get(dateKey)

    if (dayData) {
      if (check.status === 'up') {
        dayData.up++
      } else {
        dayData.down++
      }
      if (check.latency !== null) {
        dayData.latencies.push(check.latency)
      }
    }
  }

  // Converte para array de resultados
  const result: DailyUptimeData[] = []

  for (const [date, data] of dailyData) {
    const totalChecks = data.up + data.down
    const uptimePercentage = totalChecks > 0 ? (data.up / totalChecks) * 100 : 0
    const avgLatency = data.latencies.length > 0
      ? Math.round(data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length)
      : null

    let status: DailyUptimeData['status'] = 'no_data'
    if (totalChecks > 0) {
      if (uptimePercentage === 100) {
        status = 'up'
      } else if (uptimePercentage === 0) {
        status = 'down'
      } else {
        // Teve interrupções mas não ficou totalmente fora
        status = 'degraded'
      }
    }

    result.push({
      date,
      totalChecks,
      upChecks: data.up,
      downChecks: data.down,
      avgLatency,
      uptimePercentage,
      status,
    })
  }

  return result
}
