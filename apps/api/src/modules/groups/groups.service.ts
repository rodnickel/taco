import { prisma } from '../../lib/prisma.js'
import type { CreateGroupInput, UpdateGroupInput } from './groups.schema.js'

// ============================================
// Tipos de Status do Grupo
// ============================================

export type GroupStatus = 'up' | 'down' | 'partial' | 'degraded' | 'unknown'

export interface MonitorInGroup {
  id: string
  name: string
  url: string
  currentStatus: string | null
  lastCheck: Date | null
  lastLatency: number | null
}

export interface GroupWithStatus {
  id: string
  name: string
  description: string | null
  status: GroupStatus
  monitorsUp: number
  monitorsDown: number
  monitorsTotal: number
  monitors: MonitorInGroup[]
  createdAt: Date
  updatedAt: Date
}

// ============================================
// Calcular Status do Grupo
// ============================================

function calculateGroupStatus(monitors: { currentStatus: string | null }[]): {
  status: GroupStatus
  up: number
  down: number
} {
  if (monitors.length === 0) {
    return { status: 'unknown', up: 0, down: 0 }
  }

  let up = 0
  let down = 0
  let degraded = 0

  for (const monitor of monitors) {
    if (monitor.currentStatus === 'up') {
      up++
    } else if (monitor.currentStatus === 'down') {
      down++
    } else if (monitor.currentStatus === 'degraded') {
      degraded++
    }
  }

  const total = monitors.length
  let status: GroupStatus

  if (down === total) {
    status = 'down'
  } else if (up === total) {
    status = degraded > 0 ? 'degraded' : 'up'
  } else if (down > 0) {
    status = 'partial'
  } else if (degraded > 0) {
    status = 'degraded'
  } else {
    status = 'unknown'
  }

  return { status, up, down }
}

// ============================================
// Listar Grupos do Time
// ============================================

export async function listGroups(teamId: string): Promise<GroupWithStatus[]> {
  const groups = await prisma.monitorGroup.findMany({
    where: { teamId },
    include: {
      monitors: {
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
    orderBy: { name: 'asc' },
  })

  return groups.map((group) => {
    const { status, up, down } = calculateGroupStatus(group.monitors)

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      status,
      monitorsUp: up,
      monitorsDown: down,
      monitorsTotal: group.monitors.length,
      monitors: group.monitors,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }
  })
}

// ============================================
// Obter Grupo por ID
// ============================================

export async function getGroupById(
  groupId: string,
  teamId: string
): Promise<GroupWithStatus | null> {
  const group = await prisma.monitorGroup.findFirst({
    where: { id: groupId, teamId },
    include: {
      monitors: {
        select: {
          id: true,
          name: true,
          url: true,
          currentStatus: true,
          lastCheck: true,
          lastLatency: true,
        },
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!group) {
    return null
  }

  const { status, up, down } = calculateGroupStatus(group.monitors)

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    status,
    monitorsUp: up,
    monitorsDown: down,
    monitorsTotal: group.monitors.length,
    monitors: group.monitors,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  }
}

// ============================================
// Criar Grupo
// ============================================

export async function createGroup(
  teamId: string,
  data: CreateGroupInput
): Promise<GroupWithStatus> {
  const group = await prisma.monitorGroup.create({
    data: {
      name: data.name,
      description: data.description,
      teamId,
    },
  })

  // Se foram passados monitorIds, associar ao grupo
  if (data.monitorIds && data.monitorIds.length > 0) {
    await prisma.monitor.updateMany({
      where: {
        id: { in: data.monitorIds },
        teamId, // Garantir que são do mesmo time
      },
      data: { groupId: group.id },
    })
  }

  // Retornar com os monitores atualizados
  return (await getGroupById(group.id, teamId))!
}

// ============================================
// Atualizar Grupo
// ============================================

export async function updateGroup(
  groupId: string,
  teamId: string,
  data: UpdateGroupInput
): Promise<GroupWithStatus | null> {
  // Verificar se existe
  const existing = await prisma.monitorGroup.findFirst({
    where: { id: groupId, teamId },
  })

  if (!existing) {
    return null
  }

  // Atualizar dados básicos
  await prisma.monitorGroup.update({
    where: { id: groupId },
    data: {
      name: data.name,
      description: data.description,
    },
  })

  // Se monitorIds foi passado, atualizar associações
  if (data.monitorIds !== undefined) {
    // Remover monitores antigos do grupo
    await prisma.monitor.updateMany({
      where: { groupId, teamId },
      data: { groupId: null },
    })

    // Adicionar novos monitores
    if (data.monitorIds.length > 0) {
      await prisma.monitor.updateMany({
        where: {
          id: { in: data.monitorIds },
          teamId,
        },
        data: { groupId },
      })
    }
  }

  return getGroupById(groupId, teamId)
}

// ============================================
// Deletar Grupo
// ============================================

export async function deleteGroup(groupId: string, teamId: string): Promise<boolean> {
  const existing = await prisma.monitorGroup.findFirst({
    where: { id: groupId, teamId },
  })

  if (!existing) {
    return false
  }

  // Remover associação dos monitores primeiro
  await prisma.monitor.updateMany({
    where: { groupId },
    data: { groupId: null },
  })

  // Deletar o grupo
  await prisma.monitorGroup.delete({
    where: { id: groupId },
  })

  return true
}

// ============================================
// Adicionar Monitores ao Grupo
// ============================================

export async function addMonitorsToGroup(
  groupId: string,
  teamId: string,
  monitorIds: string[]
): Promise<GroupWithStatus | null> {
  const existing = await prisma.monitorGroup.findFirst({
    where: { id: groupId, teamId },
  })

  if (!existing) {
    return null
  }

  await prisma.monitor.updateMany({
    where: {
      id: { in: monitorIds },
      teamId,
    },
    data: { groupId },
  })

  return getGroupById(groupId, teamId)
}

// ============================================
// Remover Monitores do Grupo
// ============================================

export async function removeMonitorsFromGroup(
  groupId: string,
  teamId: string,
  monitorIds: string[]
): Promise<GroupWithStatus | null> {
  const existing = await prisma.monitorGroup.findFirst({
    where: { id: groupId, teamId },
  })

  if (!existing) {
    return null
  }

  await prisma.monitor.updateMany({
    where: {
      id: { in: monitorIds },
      groupId,
      teamId,
    },
    data: { groupId: null },
  })

  return getGroupById(groupId, teamId)
}

// ============================================
// Listar Monitores sem Grupo
// ============================================

export async function listUngroupedMonitors(teamId: string) {
  return prisma.monitor.findMany({
    where: {
      teamId,
      groupId: null,
    },
    select: {
      id: true,
      name: true,
      url: true,
      currentStatus: true,
    },
    orderBy: { name: 'asc' },
  })
}
