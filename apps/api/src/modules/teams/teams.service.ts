import { prisma } from '../../lib/prisma.js'
import { checkTeamMemberLimit } from '../plans/limits.service.js'
import type {
  CreateTeamInput,
  UpdateTeamInput,
  CreateInviteInput,
  TeamRole,
  TeamWithMembers,
  TeamMemberInfo,
  TeamInviteInfo,
  PublicInviteInfo,
} from './teams.schema.js'

// Include padrão para queries de times
const teamInclude = {
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
  _count: {
    select: {
      monitors: true,
      alertChannels: true,
      statusPages: true,
    },
  },
}

// ============================================
// CRUD de Times
// ============================================

export async function createTeam(
  userId: string,
  data: CreateTeamInput
): Promise<TeamWithMembers> {
  // Verificar se slug já existe
  const existingSlug = await prisma.team.findUnique({
    where: { slug: data.slug },
  })

  if (existingSlug) {
    throw new Error('Slug já está em uso')
  }

  // Buscar plano Free para atribuir ao novo time
  const freePlan = await prisma.plan.findUnique({
    where: { slug: 'free' },
  })

  if (!freePlan) {
    throw new Error('Plano Free não encontrado. Execute o seed dos planos.')
  }

  // Criar time, adicionar criador como ADMIN e atribuir plano Free
  const team = await prisma.team.create({
    data: {
      name: data.name,
      slug: data.slug,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: 'ADMIN',
        },
      },
      subscription: {
        create: {
          planId: freePlan.id,
          status: 'ACTIVE',
        },
      },
    },
    include: teamInclude,
  })

  return team as unknown as TeamWithMembers
}

export async function findAllTeams(userId: string): Promise<TeamWithMembers[]> {
  // Retorna todos os times onde o usuário é membro
  const teams = await prisma.team.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    include: teamInclude,
    orderBy: { createdAt: 'desc' },
  })

  return teams as unknown as TeamWithMembers[]
}

export async function findTeamById(
  userId: string,
  teamId: string
): Promise<TeamWithMembers | null> {
  // Verificar se usuário é membro do time
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
  })

  if (!membership) {
    return null
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: teamInclude,
  })

  return team as unknown as TeamWithMembers
}

export async function updateTeam(
  userId: string,
  teamId: string,
  data: UpdateTeamInput
): Promise<TeamWithMembers | null> {
  // Verificar se usuário é ADMIN do time
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
  })

  if (!membership || membership.role !== 'ADMIN') {
    return null
  }

  // Verificar se novo slug já existe (se fornecido)
  if (data.slug) {
    const existingSlug = await prisma.team.findFirst({
      where: {
        slug: data.slug,
        id: { not: teamId },
      },
    })

    if (existingSlug) {
      throw new Error('Slug já está em uso')
    }
  }

  const team = await prisma.team.update({
    where: { id: teamId },
    data,
    include: teamInclude,
  })

  return team as unknown as TeamWithMembers
}

export async function deleteTeam(
  userId: string,
  teamId: string
): Promise<boolean> {
  // Verificar se usuário é o owner do time
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  })

  if (!team || team.ownerId !== userId) {
    return false
  }

  await prisma.team.delete({
    where: { id: teamId },
  })

  return true
}

// ============================================
// Gerenciamento de Membros
// ============================================

export async function getTeamMembers(
  userId: string,
  teamId: string
): Promise<TeamMemberInfo[] | null> {
  // Verificar se usuário é membro do time
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
  })

  if (!membership) {
    return null
  }

  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  return members as unknown as TeamMemberInfo[]
}

export async function updateMemberRole(
  userId: string,
  teamId: string,
  targetUserId: string,
  newRole: TeamRole
): Promise<TeamMemberInfo | null> {
  // Verificar se usuário é ADMIN do time
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
  })

  if (!membership || membership.role !== 'ADMIN') {
    return null
  }

  // Verificar se target é membro do time
  const targetMembership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId: targetUserId },
    },
  })

  if (!targetMembership) {
    throw new Error('Usuário não é membro deste time')
  }

  // Verificar se é o owner (não pode ter role alterado)
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  })

  if (team?.ownerId === targetUserId) {
    throw new Error('Não é possível alterar a role do owner do time')
  }

  const updated = await prisma.teamMember.update({
    where: {
      teamId_userId: { teamId, userId: targetUserId },
    },
    data: { role: newRole },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return updated as unknown as TeamMemberInfo
}

export async function removeMember(
  userId: string,
  teamId: string,
  targetUserId: string
): Promise<boolean> {
  // Verificar se usuário é ADMIN do time
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
  })

  if (!membership || membership.role !== 'ADMIN') {
    return false
  }

  // Verificar se target é o owner (não pode ser removido)
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  })

  if (team?.ownerId === targetUserId) {
    throw new Error('Não é possível remover o owner do time')
  }

  // Verificar se target é membro
  const targetMembership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId: targetUserId },
    },
  })

  if (!targetMembership) {
    return false
  }

  await prisma.teamMember.delete({
    where: {
      teamId_userId: { teamId, userId: targetUserId },
    },
  })

  return true
}

export async function leaveTeam(
  userId: string,
  teamId: string
): Promise<boolean> {
  // Verificar se usuário é membro do time
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
  })

  if (!membership) {
    return false
  }

  // Verificar se é o owner (não pode sair)
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  })

  if (team?.ownerId === userId) {
    throw new Error('Owner não pode sair do time. Transfira a ownership ou delete o time.')
  }

  await prisma.teamMember.delete({
    where: {
      teamId_userId: { teamId, userId },
    },
  })

  return true
}

// ============================================
// Sistema de Convites
// ============================================

export async function createInvite(
  userId: string,
  teamId: string,
  data: CreateInviteInput
): Promise<TeamInviteInfo | null> {
  // Verificar se usuário é ADMIN do time
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
  })

  if (!membership || membership.role !== 'ADMIN') {
    return null
  }

  // Verificar limite de membros do plano
  const limitCheck = await checkTeamMemberLimit(teamId)
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.message || 'Limite de membros atingido')
  }

  // Se email fornecido, verificar se já existe convite pendente para este email
  if (data.email) {
    const existingInvite = await prisma.teamInvite.findFirst({
      where: {
        teamId,
        email: data.email,
        expiresAt: { gt: new Date() },
        OR: [
          { maxUses: 0 }, // Ilimitado
          { useCount: { lt: prisma.teamInvite.fields.maxUses } }, // Não usado completamente
        ],
      },
    })

    if (existingInvite) {
      throw new Error('Já existe um convite pendente para este email')
    }

    // Verificar se usuário já é membro pelo email
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        user: { email: data.email },
      },
    })

    if (existingMember) {
      throw new Error('Este usuário já é membro do time')
    }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + data.expiresInDays)

  const invite = await prisma.teamInvite.create({
    data: {
      teamId,
      invitedById: userId,
      email: data.email || null,
      role: data.role,
      expiresAt,
      maxUses: data.maxUses,
    },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return invite as unknown as TeamInviteInfo
}

export async function getTeamInvites(
  userId: string,
  teamId: string
): Promise<TeamInviteInfo[] | null> {
  // Verificar se usuário é ADMIN do time
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
  })

  if (!membership || membership.role !== 'ADMIN') {
    return null
  }

  const invites = await prisma.teamInvite.findMany({
    where: {
      teamId,
      expiresAt: { gt: new Date() },
    },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return invites as unknown as TeamInviteInfo[]
}

export async function revokeInvite(
  userId: string,
  teamId: string,
  inviteId: string
): Promise<boolean> {
  // Verificar se usuário é ADMIN do time
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
  })

  if (!membership || membership.role !== 'ADMIN') {
    return false
  }

  const invite = await prisma.teamInvite.findFirst({
    where: {
      id: inviteId,
      teamId,
    },
  })

  if (!invite) {
    return false
  }

  await prisma.teamInvite.delete({
    where: { id: inviteId },
  })

  return true
}

export async function getInviteByToken(
  token: string
): Promise<PublicInviteInfo | null> {
  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: {
      team: {
        select: {
          name: true,
          slug: true,
        },
      },
      invitedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  if (!invite) {
    return null
  }

  // Verificar se expirou
  if (invite.expiresAt < new Date()) {
    return null
  }

  // Verificar se atingiu limite de usos
  if (invite.maxUses > 0 && invite.useCount >= invite.maxUses) {
    return null
  }

  return {
    teamName: invite.team.name,
    teamSlug: invite.team.slug,
    role: invite.role as TeamRole,
    expiresAt: invite.expiresAt,
    invitedByName: invite.invitedBy.name,
    invitedByEmail: invite.invitedBy.email,
  }
}

export async function acceptInvite(
  userId: string,
  token: string
): Promise<{ teamId: string; role: TeamRole } | null> {
  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: {
      team: true,
    },
  })

  if (!invite) {
    return null
  }

  // Verificar se expirou
  if (invite.expiresAt < new Date()) {
    throw new Error('Convite expirado')
  }

  // Verificar se atingiu limite de usos
  if (invite.maxUses > 0 && invite.useCount >= invite.maxUses) {
    throw new Error('Convite já foi utilizado')
  }

  // Verificar limite de membros do plano
  const limitCheck = await checkTeamMemberLimit(invite.teamId)
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.message || 'Limite de membros do time atingido')
  }

  // Verificar se é convite por email e o email confere
  if (invite.email) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (user?.email !== invite.email) {
      throw new Error('Este convite foi enviado para outro email')
    }
  }

  // Verificar se já é membro
  const existingMembership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId: invite.teamId, userId },
    },
  })

  if (existingMembership) {
    throw new Error('Você já é membro deste time')
  }

  // Criar membership e atualizar contador do convite
  await prisma.$transaction([
    prisma.teamMember.create({
      data: {
        teamId: invite.teamId,
        userId,
        role: invite.role,
      },
    }),
    prisma.teamInvite.update({
      where: { id: invite.id },
      data: {
        useCount: { increment: 1 },
        usedAt: invite.maxUses === 1 ? new Date() : undefined,
      },
    }),
  ])

  return {
    teamId: invite.teamId,
    role: invite.role as TeamRole,
  }
}

// ============================================
// Helpers
// ============================================

export async function getUserTeamRole(
  userId: string,
  teamId: string
): Promise<TeamRole | null> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
  })

  return membership?.role as TeamRole | null
}

export async function checkSlugAvailable(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await prisma.team.findFirst({
    where: {
      slug,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })

  return !existing
}
