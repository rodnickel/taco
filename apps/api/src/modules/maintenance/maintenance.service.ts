import { prisma } from '../../lib/prisma.js'
import type {
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  ListMaintenanceQuery,
} from './maintenance.schema.js'

// ============================================
// Serviço de Janelas de Manutenção
// ============================================

// Cria uma janela de manutenção
export async function createMaintenance(teamId: string, data: CreateMaintenanceInput) {
  const maintenance = await prisma.maintenanceWindow.create({
    data: {
      name: data.name,
      description: data.description,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      type: data.type,
      suppressAlerts: data.suppressAlerts,
      suppressIncidents: data.suppressIncidents,
      showOnStatusPage: data.showOnStatusPage,
      teamId,
      monitors: {
        create: data.monitorIds.map((monitorId) => ({ monitorId })),
      },
    },
    include: {
      monitors: {
        include: {
          monitor: {
            select: { id: true, name: true, url: true },
          },
        },
      },
    },
  })

  return maintenance
}

// Lista janelas de manutenção
export async function findAllMaintenance(teamId: string, query: ListMaintenanceQuery) {
  const now = new Date()
  const where: Record<string, unknown> = { teamId }

  if (query.active !== undefined) {
    where.active = query.active === 'true'
  }

  // Filtra por status temporal
  if (query.status !== 'all') {
    switch (query.status) {
      case 'upcoming':
        where.startTime = { gt: now }
        break
      case 'ongoing':
        where.startTime = { lte: now }
        where.endTime = { gte: now }
        break
      case 'past':
        where.endTime = { lt: now }
        break
    }
  }

  const [maintenances, total] = await Promise.all([
    prisma.maintenanceWindow.findMany({
      where,
      include: {
        monitors: {
          include: {
            monitor: {
              select: { id: true, name: true, url: true },
            },
          },
        },
      },
      orderBy: { startTime: 'desc' },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.maintenanceWindow.count({ where }),
  ])

  // Adiciona status calculado
  const maintenancesWithStatus = maintenances.map((m) => ({
    ...m,
    status: getMaintenanceStatus(m.startTime, m.endTime, m.active),
  }))

  return {
    maintenances: maintenancesWithStatus,
    total,
    limit: query.limit,
    offset: query.offset,
  }
}

// Busca uma janela por ID
export async function findMaintenanceById(teamId: string, id: string) {
  const maintenance = await prisma.maintenanceWindow.findFirst({
    where: { id, teamId },
    include: {
      monitors: {
        include: {
          monitor: {
            select: { id: true, name: true, url: true },
          },
        },
      },
    },
  })

  if (!maintenance) return null

  return {
    ...maintenance,
    status: getMaintenanceStatus(maintenance.startTime, maintenance.endTime, maintenance.active),
  }
}

// Atualiza uma janela de manutenção
export async function updateMaintenance(
  teamId: string,
  id: string,
  data: UpdateMaintenanceInput
) {
  const existing = await prisma.maintenanceWindow.findFirst({
    where: { id, teamId },
  })

  if (!existing) {
    return null
  }

  // Se monitorIds foi fornecido, recria os relacionamentos
  if (data.monitorIds) {
    await prisma.maintenanceMonitor.deleteMany({
      where: { maintenanceId: id },
    })
  }

  const maintenance = await prisma.maintenanceWindow.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      type: data.type,
      active: data.active,
      suppressAlerts: data.suppressAlerts,
      suppressIncidents: data.suppressIncidents,
      showOnStatusPage: data.showOnStatusPage,
      ...(data.monitorIds
        ? {
            monitors: {
              create: data.monitorIds.map((monitorId) => ({ monitorId })),
            },
          }
        : {}),
    },
    include: {
      monitors: {
        include: {
          monitor: {
            select: { id: true, name: true, url: true },
          },
        },
      },
    },
  })

  return {
    ...maintenance,
    status: getMaintenanceStatus(maintenance.startTime, maintenance.endTime, maintenance.active),
  }
}

// Deleta uma janela de manutenção
export async function deleteMaintenance(teamId: string, id: string) {
  const existing = await prisma.maintenanceWindow.findFirst({
    where: { id, teamId },
  })

  if (!existing) {
    return false
  }

  await prisma.maintenanceWindow.delete({
    where: { id },
  })

  return true
}

// ============================================
// Funções de verificação de manutenção
// ============================================

// Calcula o status da manutenção
function getMaintenanceStatus(
  startTime: Date,
  endTime: Date,
  active: boolean
): 'upcoming' | 'ongoing' | 'past' | 'cancelled' {
  if (!active) return 'cancelled'

  const now = new Date()
  if (now < startTime) return 'upcoming'
  if (now > endTime) return 'past'
  return 'ongoing'
}

// Verifica se um monitor está em manutenção
export async function isMonitorInMaintenance(monitorId: string): Promise<boolean> {
  const now = new Date()

  const maintenance = await prisma.maintenanceMonitor.findFirst({
    where: {
      monitorId,
      maintenance: {
        active: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    },
  })

  return !!maintenance
}

// Busca a manutenção ativa para um monitor
export async function getActiveMaintenanceForMonitor(monitorId: string) {
  const now = new Date()

  const maintenanceMonitor = await prisma.maintenanceMonitor.findFirst({
    where: {
      monitorId,
      maintenance: {
        active: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    },
    include: {
      maintenance: true,
    },
  })

  return maintenanceMonitor?.maintenance || null
}

// Verifica se alertas devem ser suprimidos para um monitor
export async function shouldSuppressAlerts(monitorId: string): Promise<boolean> {
  const now = new Date()

  const maintenance = await prisma.maintenanceMonitor.findFirst({
    where: {
      monitorId,
      maintenance: {
        active: true,
        suppressAlerts: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    },
  })

  return !!maintenance
}

// Verifica se incidentes devem ser suprimidos para um monitor
export async function shouldSuppressIncidents(monitorId: string): Promise<boolean> {
  const now = new Date()

  const maintenance = await prisma.maintenanceMonitor.findFirst({
    where: {
      monitorId,
      maintenance: {
        active: true,
        suppressIncidents: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    },
  })

  return !!maintenance
}

// Busca manutenções ativas para exibir na status page
export async function getActiveMaintenancesForStatusPage(teamId: string) {
  const now = new Date()

  const maintenances = await prisma.maintenanceWindow.findMany({
    where: {
      teamId,
      active: true,
      showOnStatusPage: true,
      OR: [
        // Em andamento
        {
          startTime: { lte: now },
          endTime: { gte: now },
        },
        // Agendadas para as próximas 24h
        {
          startTime: {
            gt: now,
            lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      ],
    },
    include: {
      monitors: {
        include: {
          monitor: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  })

  return maintenances.map((m) => ({
    ...m,
    status: getMaintenanceStatus(m.startTime, m.endTime, m.active),
  }))
}
