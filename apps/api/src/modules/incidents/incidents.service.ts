import { prisma } from '../../lib/prisma.js'
import { stopEscalation } from '../../services/escalation.service.js'
import type {
  CreateIncidentInput,
  AddIncidentUpdateInput,
  ListIncidentsQuery,
  IncidentWithDetails,
} from './incidents.schema.js'

// ============================================
// Service de Incidents
// ============================================

// Cria um novo incidente (chamado pelo worker quando monitor cai)
export async function createIncident(data: CreateIncidentInput) {
  // Verifica se ja existe um incidente em andamento para este monitor
  const existingIncident = await prisma.incident.findFirst({
    where: {
      monitorId: data.monitorId,
      status: { in: ['ongoing', 'acknowledged'] },
    },
  })

  if (existingIncident) {
    // Ja existe um incidente em andamento, nao cria outro
    return existingIncident
  }

  const incident = await prisma.incident.create({
    data: {
      title: data.title,
      cause: data.cause,
      status: 'ongoing',
      monitorId: data.monitorId,
      teamId: data.teamId,
    },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true,
        },
      },
    },
  })

  // Cria update inicial
  await prisma.incidentUpdate.create({
    data: {
      incidentId: incident.id,
      message: `Incidente iniciado: ${data.cause || 'Monitor indisponivel'}`,
      status: 'ongoing',
    },
  })

  return incident
}

// Lista incidentes do time
export async function listIncidents(teamId: string, query: ListIncidentsQuery) {
  const where: Record<string, unknown> = { teamId }

  if (query.status && query.status !== 'all') {
    where.status = query.status
  }

  if (query.monitorId) {
    where.monitorId = query.monitorId
  }

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
        acknowledgedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            updates: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.incident.count({ where }),
  ])

  // Calcula duracao para cada incidente
  const incidentsWithDuration = incidents.map((incident) => {
    const endTime = incident.resolvedAt || new Date()
    const duration = Math.floor((endTime.getTime() - incident.startedAt.getTime()) / 1000)
    return {
      ...incident,
      duration,
    }
  })

  return {
    incidents: incidentsWithDuration,
    total,
    limit: query.limit,
    offset: query.offset,
  }
}

// Busca um incidente por ID com todos os detalhes
export async function getIncidentById(
  incidentId: string,
  teamId: string
): Promise<IncidentWithDetails | null> {
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      teamId,
    },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true,
        },
      },
      acknowledgedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      updates: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!incident) return null

  // Calcula duracao
  const endTime = incident.resolvedAt || new Date()
  const duration = Math.floor((endTime.getTime() - incident.startedAt.getTime()) / 1000)

  return {
    ...incident,
    duration,
  }
}

// Reconhece um incidente (acknowledge)
export async function acknowledgeIncident(incidentId: string, userId: string, teamId: string) {
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      teamId,
      status: 'ongoing',
    },
  })

  if (!incident) {
    throw new Error('Incidente nao encontrado ou ja foi reconhecido/resolvido')
  }

  const updated = await prisma.incident.update({
    where: { id: incidentId },
    data: {
      status: 'acknowledged',
      acknowledgedAt: new Date(),
      acknowledgedById: userId,
    },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true,
        },
      },
      acknowledgedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  // Adiciona update
  await prisma.incidentUpdate.create({
    data: {
      incidentId,
      message: 'Incidente reconhecido',
      status: 'acknowledged',
    },
  })

  // Para escalonamento (reconhecimento conta como resposta)
  await stopEscalation(incidentId)

  return updated
}

// Resolve um incidente
export async function resolveIncident(
  incidentId: string,
  teamId: string,
  message?: string
) {
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      teamId,
      status: { in: ['ongoing', 'acknowledged'] },
    },
  })

  if (!incident) {
    throw new Error('Incidente nao encontrado ou ja foi resolvido')
  }

  const updated = await prisma.incident.update({
    where: { id: incidentId },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
    },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true,
        },
      },
      acknowledgedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  // Adiciona update de resolucao
  await prisma.incidentUpdate.create({
    data: {
      incidentId,
      message: message || 'Incidente resolvido',
      status: 'resolved',
    },
  })

  // Para escalonamento
  await stopEscalation(incidentId)

  return updated
}

// Resolve incidente automaticamente quando monitor volta (chamado pelo worker)
export async function autoResolveIncident(monitorId: string) {
  const incident = await prisma.incident.findFirst({
    where: {
      monitorId,
      status: { in: ['ongoing', 'acknowledged'] },
    },
  })

  if (!incident) return null

  const updated = await prisma.incident.update({
    where: { id: incident.id },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
    },
  })

  // Adiciona update de resolucao automatica
  await prisma.incidentUpdate.create({
    data: {
      incidentId: incident.id,
      message: 'Monitor voltou a ficar online - incidente resolvido automaticamente',
      status: 'resolved',
    },
  })

  return updated
}

// Adiciona um update ao incidente
export async function addIncidentUpdate(
  incidentId: string,
  teamId: string,
  data: AddIncidentUpdateInput
) {
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      teamId,
    },
  })

  if (!incident) {
    throw new Error('Incidente nao encontrado')
  }

  // Se passou um novo status, atualiza o incidente
  if (data.status && data.status !== incident.status) {
    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: data.status,
        ...(data.status === 'resolved' ? { resolvedAt: new Date() } : {}),
      },
    })
  }

  const update = await prisma.incidentUpdate.create({
    data: {
      incidentId,
      message: data.message,
      status: data.status || incident.status,
    },
  })

  return update
}

// Conta incidentes em andamento do time (para badge na sidebar)
export async function countOngoingIncidents(teamId: string) {
  return prisma.incident.count({
    where: {
      teamId,
      status: { in: ['ongoing', 'acknowledged'] },
    },
  })
}

// Busca incidente em andamento para um monitor
export async function findOngoingIncident(monitorId: string) {
  return prisma.incident.findFirst({
    where: {
      monitorId,
      status: { in: ['ongoing', 'acknowledged'] },
    },
  })
}
