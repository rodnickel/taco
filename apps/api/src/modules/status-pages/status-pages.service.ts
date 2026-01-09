import { prisma } from '../../lib/prisma.js'
import type {
  CreateStatusPageInput,
  UpdateStatusPageInput,
  UpdateStatusPageLayoutInput,
  UpdateStatusPageGroupsInput,
  StatusPageWithMonitors,
  PublicStatusPage,
  PublicMonitor,
  PublicGroup,
} from './status-pages.schema.js'

// Include padrão para queries
const statusPageInclude = {
  sections: {
    orderBy: { displayOrder: 'asc' as const },
  },
  monitors: {
    orderBy: { displayOrder: 'asc' as const },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true,
          currentStatus: true,
          lastCheck: true,
          lastLatency: true,
        },
      },
    },
  },
}

// ============================================
// Serviço de Status Pages - CRUD e operações
// Atualizado para usar teamId em vez de userId
// ============================================

export async function createStatusPage(
  teamId: string,
  data: CreateStatusPageInput
): Promise<StatusPageWithMonitors> {
  const { monitorIds, ...statusPageData } = data

  const statusPage = await prisma.statusPage.create({
    data: {
      ...statusPageData,
      teamId,
      monitors: monitorIds?.length
        ? {
            create: monitorIds.map((monitorId, index) => ({
              monitorId,
              displayOrder: index,
            })),
          }
        : undefined,
    },
    include: statusPageInclude,
  })

  return statusPage as unknown as StatusPageWithMonitors
}

export async function findAllStatusPages(teamId: string): Promise<StatusPageWithMonitors[]> {
  const statusPages = await prisma.statusPage.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    include: statusPageInclude,
  })

  return statusPages as unknown as StatusPageWithMonitors[]
}

export async function findStatusPageById(
  teamId: string,
  id: string
): Promise<StatusPageWithMonitors | null> {
  const statusPage = await prisma.statusPage.findFirst({
    where: { id, teamId },
    include: statusPageInclude,
  })

  return statusPage as unknown as StatusPageWithMonitors | null
}

export async function updateStatusPage(
  teamId: string,
  id: string,
  data: UpdateStatusPageInput
): Promise<StatusPageWithMonitors | null> {
  const existing = await prisma.statusPage.findFirst({
    where: { id, teamId },
  })

  if (!existing) {
    return null
  }

  const { monitorIds, ...statusPageData } = data

  const statusPage = await prisma.statusPage.update({
    where: { id },
    data: statusPageData,
    include: statusPageInclude,
  })

  return statusPage as unknown as StatusPageWithMonitors
}

export async function updateStatusPageLayout(
  teamId: string,
  id: string,
  data: UpdateStatusPageLayoutInput
): Promise<StatusPageWithMonitors | null> {
  const existing = await prisma.statusPage.findFirst({
    where: { id, teamId },
  })

  if (!existing) {
    return null
  }

  // Verifica se todos os monitors pertencem ao time
  const monitorIds = data.monitors.map((m) => m.monitorId)
  const monitors = await prisma.monitor.findMany({
    where: {
      id: { in: monitorIds },
      teamId,
    },
  })

  if (monitors.length !== monitorIds.length) {
    throw new Error('Um ou mais monitors não foram encontrados')
  }

  // Transação para atualizar tudo
  await prisma.$transaction(async (tx) => {
    // 1. Remove todas as seções e monitors existentes
    await tx.statusPageMonitor.deleteMany({
      where: { statusPageId: id },
    })
    await tx.statusPageSection.deleteMany({
      where: { statusPageId: id },
    })

    // 2. Cria as novas seções
    const sectionIdMap = new Map<string, string>() // oldId -> newId

    for (const section of data.sections) {
      const created = await tx.statusPageSection.create({
        data: {
          statusPageId: id,
          name: section.name,
          displayOrder: section.displayOrder,
        },
      })
      // Mapeia o ID temporário (se existir) para o novo ID
      if (section.id) {
        sectionIdMap.set(section.id, created.id)
      }
    }

    // 3. Cria os monitors com referência às seções
    for (const monitor of data.monitors) {
      let sectionId: string | null = null

      if (monitor.sectionId) {
        // Se o sectionId começa com "new-", é um ID temporário do frontend
        // Caso contrário, tenta mapear para o novo ID
        sectionId = sectionIdMap.get(monitor.sectionId) || null
      }

      await tx.statusPageMonitor.create({
        data: {
          statusPageId: id,
          monitorId: monitor.monitorId,
          displayName: monitor.displayName,
          displayOrder: monitor.displayOrder,
          sectionId,
        },
      })
    }
  })

  // Retorna a status page atualizada
  const statusPage = await prisma.statusPage.findFirst({
    where: { id },
    include: statusPageInclude,
  })

  return statusPage as unknown as StatusPageWithMonitors
}

export async function deleteStatusPage(teamId: string, id: string): Promise<boolean> {
  const existing = await prisma.statusPage.findFirst({
    where: { id, teamId },
  })

  if (!existing) {
    return false
  }

  await prisma.statusPage.delete({
    where: { id },
  })

  return true
}

export async function checkSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.statusPage.findFirst({
    where: {
      slug,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })

  return !existing
}

export async function updateStatusPageGroups(
  teamId: string,
  id: string,
  data: UpdateStatusPageGroupsInput
): Promise<StatusPageWithMonitors | null> {
  const existing = await prisma.statusPage.findFirst({
    where: { id, teamId },
  })

  if (!existing) {
    return null
  }

  // Verifica se todos os grupos pertencem ao time
  const groupIds = data.groups.map((g) => g.groupId)
  if (groupIds.length > 0) {
    const groups = await prisma.monitorGroup.findMany({
      where: {
        id: { in: groupIds },
        teamId,
      },
    })

    if (groups.length !== groupIds.length) {
      throw new Error('Um ou mais grupos não foram encontrados')
    }
  }

  // Transação para atualizar grupos
  await prisma.$transaction(async (tx) => {
    // Remove todos os grupos existentes
    await tx.statusPageGroup.deleteMany({
      where: { statusPageId: id },
    })

    // Cria os novos grupos
    for (const group of data.groups) {
      await tx.statusPageGroup.create({
        data: {
          statusPageId: id,
          groupId: group.groupId,
          displayName: group.displayName,
          displayOrder: group.displayOrder,
          isExpanded: group.isExpanded,
        },
      })
    }
  })

  // Retorna a status page atualizada
  const statusPage = await prisma.statusPage.findFirst({
    where: { id },
    include: statusPageInclude,
  })

  return statusPage as unknown as StatusPageWithMonitors
}

export async function getStatusPageGroups(teamId: string, id: string) {
  const statusPage = await prisma.statusPage.findFirst({
    where: { id, teamId },
    include: {
      groups: {
        orderBy: { displayOrder: 'asc' },
        include: {
          group: {
            include: {
              monitors: {
                select: {
                  id: true,
                  name: true,
                  currentStatus: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!statusPage) {
    return null
  }

  return statusPage.groups.map((spg) => ({
    groupId: spg.groupId,
    displayName: spg.displayName,
    displayOrder: spg.displayOrder,
    isExpanded: spg.isExpanded,
    group: {
      id: spg.group.id,
      name: spg.group.name,
      description: spg.group.description,
      monitorsCount: spg.group.monitors.length,
      monitorsUp: spg.group.monitors.filter((m) => m.currentStatus === 'up').length,
      monitorsDown: spg.group.monitors.filter((m) => m.currentStatus === 'down').length,
    },
  }))
}

// ============================================
// Funções públicas (não requerem autenticação)
// ============================================

async function prepareMonitorData(
  monitor: {
    name: string
    currentStatus: string | null
    lastCheck: Date | null
    lastLatency: number | null
    checks: { status: string; checkedAt: Date }[]
  },
  displayName: string | null,
  statusPage: { showUptime: boolean; showLatency: boolean; showHistory: boolean; historyDays: number }
): Promise<PublicMonitor> {
  // Calcula uptime percentage
  const totalChecks = monitor.checks.length
  const upChecks = monitor.checks.filter((c) => c.status === 'up').length
  const uptimePercentage = totalChecks > 0 ? (upChecks / totalChecks) * 100 : undefined

  // Prepara histórico se habilitado
  let history: { date: string; status: string; uptimePercentage: number }[] | undefined

  if (statusPage.showHistory) {
    const dailyData = new Map<string, { up: number; down: number }>()

    for (let i = 0; i < statusPage.historyDays; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (statusPage.historyDays - 1 - i))
      const dateKey = date.toISOString().split('T')[0]
      dailyData.set(dateKey, { up: 0, down: 0 })
    }

    for (const check of monitor.checks) {
      const dateKey = check.checkedAt.toISOString().split('T')[0]
      const dayData = dailyData.get(dateKey)
      if (dayData) {
        if (check.status === 'up') {
          dayData.up++
        } else {
          dayData.down++
        }
      }
    }

    history = Array.from(dailyData.entries()).map(([date, data]) => {
      const total = data.up + data.down
      const pct = total > 0 ? (data.up / total) * 100 : 0
      let status = 'no_data'
      if (total > 0) {
        if (pct === 100) status = 'up'
        else if (pct === 0) status = 'down'
        else if (pct >= 99) status = 'degraded'
        else status = 'partial'
      }
      return { date, status, uptimePercentage: pct }
    })
  }

  return {
    name: displayName || monitor.name,
    currentStatus: monitor.currentStatus,
    lastCheck: monitor.lastCheck,
    lastLatency: statusPage.showLatency ? monitor.lastLatency : null,
    uptimePercentage: statusPage.showUptime ? uptimePercentage : undefined,
    history,
  }
}

export async function getPublicStatusPage(slug: string): Promise<PublicStatusPage | null> {
  const statusPage = await prisma.statusPage.findFirst({
    where: {
      slug,
      isPublic: true,
    },
    include: {
      sections: {
        orderBy: { displayOrder: 'asc' },
      },
      monitors: {
        orderBy: { displayOrder: 'asc' },
        include: {
          monitor: {
            include: {
              checks: {
                orderBy: { checkedAt: 'desc' },
                take: 100,
              },
            },
          },
        },
      },
      groups: {
        orderBy: { displayOrder: 'asc' },
        include: {
          group: {
            include: {
              monitors: {
                include: {
                  checks: {
                    orderBy: { checkedAt: 'desc' },
                    take: 100,
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!statusPage) {
    return null
  }

  // Coleta IDs de monitors que estão em grupos (para não duplicar)
  const monitorsInGroups = new Set<string>()
  for (const spg of statusPage.groups) {
    for (const monitor of spg.group.monitors) {
      monitorsInGroups.add(monitor.id)
    }
  }

  // Agrupa monitors por seção (excluindo os que estão em grupos)
  const monitorsBySection = new Map<string | null, typeof statusPage.monitors>()

  for (const spm of statusPage.monitors) {
    // Pula monitors que já estão em um grupo
    if (monitorsInGroups.has(spm.monitor.id)) {
      continue
    }
    const sectionId = spm.sectionId
    if (!monitorsBySection.has(sectionId)) {
      monitorsBySection.set(sectionId, [])
    }
    monitorsBySection.get(sectionId)!.push(spm)
  }

  // Prepara seções com seus monitors
  const sections = await Promise.all(
    statusPage.sections.map(async (section) => {
      const sectionMonitors = monitorsBySection.get(section.id) || []
      const monitors = await Promise.all(
        sectionMonitors.map((spm) =>
          prepareMonitorData(spm.monitor, spm.displayName, statusPage)
        )
      )

      return {
        id: section.id,
        name: section.name,
        displayOrder: section.displayOrder,
        monitors,
      }
    })
  )

  // Prepara monitors sem seção
  const unsectionedMonitors = monitorsBySection.get(null) || []
  const monitors = await Promise.all(
    unsectionedMonitors.map((spm) =>
      prepareMonitorData(spm.monitor, spm.displayName, statusPage)
    )
  )

  // Prepara grupos com seus monitors
  const groups: PublicGroup[] = await Promise.all(
    statusPage.groups.map(async (spg) => {
      const groupMonitors = await Promise.all(
        spg.group.monitors.map((monitor) =>
          prepareMonitorData(monitor, null, statusPage)
        )
      )

      // Calcula status agregado do grupo
      const monitorsUp = spg.group.monitors.filter((m) => m.currentStatus === 'up').length
      const monitorsDown = spg.group.monitors.filter((m) => m.currentStatus === 'down').length
      const monitorsTotal = spg.group.monitors.length

      let status: 'up' | 'down' | 'partial' | 'degraded' | 'unknown' = 'unknown'
      if (monitorsTotal > 0) {
        if (monitorsDown === monitorsTotal) {
          status = 'down'
        } else if (monitorsUp === monitorsTotal) {
          status = 'up'
        } else if (monitorsDown > 0) {
          status = 'partial'
        } else {
          status = 'degraded'
        }
      }

      return {
        id: spg.group.id,
        name: spg.displayName || spg.group.name,
        description: spg.group.description,
        displayOrder: spg.displayOrder,
        isExpanded: spg.isExpanded,
        status,
        monitorsUp,
        monitorsDown,
        monitorsTotal,
        monitors: groupMonitors,
      }
    })
  )

  return {
    slug: statusPage.slug,
    name: statusPage.name,
    description: statusPage.description,
    logoUrl: statusPage.logoUrl,
    faviconUrl: statusPage.faviconUrl,
    primaryColor: statusPage.primaryColor,
    backgroundColor: statusPage.backgroundColor,
    showUptime: statusPage.showUptime,
    showLatency: statusPage.showLatency,
    showHistory: statusPage.showHistory,
    historyDays: statusPage.historyDays,
    sections,
    monitors,
    groups,
  }
}

// Busca incidentes públicos de uma status page
export async function getPublicIncidents(
  slug: string,
  options: { limit?: number; offset?: number; status?: 'all' | 'ongoing' | 'resolved' } = {}
) {
  const { limit = 20, offset = 0, status = 'all' } = options

  // Busca a status page
  const statusPage = await prisma.statusPage.findFirst({
    where: { slug, isPublic: true },
    select: {
      teamId: true,
      monitors: { select: { monitorId: true } },
      groups: {
        select: {
          group: {
            select: {
              monitors: { select: { id: true } },
            },
          },
        },
      },
    },
  })

  if (!statusPage) {
    return null
  }

  // Coleta IDs de todos os monitors na status page
  const monitorIds = new Set<string>()

  for (const spm of statusPage.monitors) {
    monitorIds.add(spm.monitorId)
  }

  for (const spg of statusPage.groups) {
    for (const monitor of spg.group.monitors) {
      monitorIds.add(monitor.id)
    }
  }

  // Filtra incidentes
  const where: Record<string, unknown> = {
    monitorId: { in: Array.from(monitorIds) },
  }

  if (status !== 'all') {
    where.status = status === 'ongoing' ? { in: ['ongoing', 'acknowledged'] } : 'resolved'
  }

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: {
        monitor: {
          select: { id: true, name: true },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Últimas 5 atualizações por incidente
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.incident.count({ where }),
  ])

  // Formata incidentes para exibição pública
  const publicIncidents = incidents.map((incident) => ({
    id: incident.id,
    title: incident.title,
    status: incident.status,
    cause: incident.cause,
    startedAt: incident.startedAt,
    resolvedAt: incident.resolvedAt,
    duration: incident.resolvedAt
      ? Math.floor((incident.resolvedAt.getTime() - incident.startedAt.getTime()) / 1000)
      : Math.floor((Date.now() - incident.startedAt.getTime()) / 1000),
    monitor: {
      id: incident.monitor.id,
      name: incident.monitor.name,
    },
    updates: incident.updates.map((update) => ({
      id: update.id,
      message: update.message,
      status: update.status,
      createdAt: update.createdAt,
    })),
  }))

  return {
    incidents: publicIncidents,
    total,
    limit,
    offset,
  }
}

// Busca dados mínimos para o widget embed
export async function getWidgetData(slug: string) {
  const statusPage = await prisma.statusPage.findFirst({
    where: { slug, isPublic: true },
    select: {
      name: true,
      slug: true,
      primaryColor: true,
      monitors: {
        select: {
          monitor: {
            select: { currentStatus: true },
          },
        },
      },
      groups: {
        select: {
          group: {
            select: {
              monitors: {
                select: { currentStatus: true },
              },
            },
          },
        },
      },
    },
  })

  if (!statusPage) {
    return null
  }

  // Coleta todos os status dos monitors
  const allStatuses: (string | null)[] = []

  for (const spm of statusPage.monitors) {
    allStatuses.push(spm.monitor.currentStatus)
  }

  for (const spg of statusPage.groups) {
    for (const monitor of spg.group.monitors) {
      allStatuses.push(monitor.currentStatus)
    }
  }

  // Calcula status geral
  const total = allStatuses.length
  const upCount = allStatuses.filter(s => s === 'up').length
  const downCount = allStatuses.filter(s => s === 'down').length

  let status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' = 'operational'
  let message = 'Todos os sistemas operacionais'

  if (total === 0) {
    status = 'operational'
    message = 'Sem dados'
  } else if (downCount === total) {
    status = 'major_outage'
    message = 'Interrupção total'
  } else if (downCount > 0) {
    status = 'partial_outage'
    message = `${downCount} de ${total} sistemas com problemas`
  } else if (upCount < total) {
    status = 'degraded'
    message = 'Alguns sistemas degradados'
  }

  return {
    name: statusPage.name,
    slug: statusPage.slug,
    primaryColor: statusPage.primaryColor,
    status,
    message,
    monitorsTotal: total,
    monitorsUp: upCount,
    monitorsDown: downCount,
    updatedAt: new Date().toISOString(),
  }
}

// Busca manutenções públicas de uma status page
export async function getPublicMaintenances(slug: string) {
  const statusPage = await prisma.statusPage.findFirst({
    where: { slug, isPublic: true },
    select: {
      teamId: true,
      monitors: { select: { monitorId: true } },
      groups: {
        select: {
          group: {
            select: {
              monitors: { select: { id: true } },
            },
          },
        },
      },
    },
  })

  if (!statusPage) {
    return null
  }

  // Coleta IDs de todos os monitors na status page
  const monitorIds = new Set<string>()

  for (const spm of statusPage.monitors) {
    monitorIds.add(spm.monitorId)
  }

  for (const spg of statusPage.groups) {
    for (const monitor of spg.group.monitors) {
      monitorIds.add(monitor.id)
    }
  }

  const now = new Date()

  // Busca manutenções ativas ou futuras (próximas 7 dias)
  const maintenances = await prisma.maintenanceWindow.findMany({
    where: {
      teamId: statusPage.teamId,
      active: true,
      showOnStatusPage: true,
      OR: [
        // Em andamento
        {
          startTime: { lte: now },
          endTime: { gte: now },
        },
        // Agendadas para os próximos 7 dias
        {
          startTime: {
            gt: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      ],
      monitors: {
        some: {
          monitorId: { in: Array.from(monitorIds) },
        },
      },
    },
    include: {
      monitors: {
        where: {
          monitorId: { in: Array.from(monitorIds) },
        },
        include: {
          monitor: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  })

  // Formata manutenções para exibição pública
  return maintenances.map((m) => {
    const isOngoing = now >= m.startTime && now <= m.endTime
    const isUpcoming = now < m.startTime

    return {
      id: m.id,
      name: m.name,
      description: m.description,
      startTime: m.startTime,
      endTime: m.endTime,
      status: isOngoing ? 'ongoing' : isUpcoming ? 'upcoming' : 'past',
      monitors: m.monitors.map((mm) => ({
        id: mm.monitor.id,
        name: mm.monitor.name,
      })),
    }
  })
}
