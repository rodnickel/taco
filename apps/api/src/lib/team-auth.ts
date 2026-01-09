import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from './prisma.js'

// ============================================
// Tipos de Autorização de Times
// ============================================

export type TeamRole = 'ADMIN' | 'EDITOR' | 'VIEWER'

export interface TeamContext {
  teamId: string
  role: TeamRole
}

// Estende os tipos do Fastify para incluir o contexto do time
declare module 'fastify' {
  interface FastifyRequest {
    teamContext?: TeamContext
  }

  interface FastifyInstance {
    requireTeam: (
      request: FastifyRequest,
      reply: FastifyReply,
      requiredRole?: TeamRole
    ) => Promise<void>
  }
}

// ============================================
// Hierarquia de Roles
// ============================================

const roleHierarchy: Record<TeamRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
}

export function hasTeamRole(userRole: TeamRole, requiredRole: TeamRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

// ============================================
// Middleware de Autorização de Times
// ============================================

export async function registerTeamAuthDecorator(app: FastifyInstance) {
  app.decorate(
    'requireTeam',
    async function (
      request: FastifyRequest,
      reply: FastifyReply,
      requiredRole: TeamRole = 'VIEWER'
    ) {
      // Pegar teamId do header
      const teamId = request.headers['x-team-id'] as string

      if (!teamId) {
        return reply.status(400).send({
          error: 'Header X-Team-Id é obrigatório',
          code: 'TEAM_REQUIRED',
        })
      }

      // Verificar se usuário está autenticado
      if (!request.user?.sub) {
        return reply.status(401).send({
          error: 'Não autenticado',
          code: 'UNAUTHORIZED',
        })
      }

      // Verificar membership e role
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: request.user.sub,
          },
        },
      })

      if (!membership) {
        return reply.status(403).send({
          error: 'Você não é membro deste time',
          code: 'NOT_TEAM_MEMBER',
        })
      }

      if (!hasTeamRole(membership.role as TeamRole, requiredRole)) {
        return reply.status(403).send({
          error: 'Permissão insuficiente',
          code: 'INSUFFICIENT_ROLE',
          required: requiredRole,
          current: membership.role,
        })
      }

      // Anexar contexto do time ao request
      request.teamContext = {
        teamId,
        role: membership.role as TeamRole,
      }
    }
  )
}

// ============================================
// Hook factory para rotas que requerem time
// ============================================

export function createTeamAuthHook(requiredRole: TeamRole = 'VIEWER') {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    // Primeiro verifica autenticação
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({
        error: 'Token inválido ou expirado',
        code: 'UNAUTHORIZED',
      })
    }

    // Pegar teamId do header
    const teamId = request.headers['x-team-id'] as string

    if (!teamId) {
      return reply.status(400).send({
        error: 'Header X-Team-Id é obrigatório',
        code: 'TEAM_REQUIRED',
      })
    }

    // Verificar membership e role
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: request.user.sub,
        },
      },
    })

    if (!membership) {
      return reply.status(403).send({
        error: 'Você não é membro deste time',
        code: 'NOT_TEAM_MEMBER',
      })
    }

    if (!hasTeamRole(membership.role as TeamRole, requiredRole)) {
      return reply.status(403).send({
        error: 'Permissão insuficiente',
        code: 'INSUFFICIENT_ROLE',
        required: requiredRole,
        current: membership.role,
      })
    }

    // Anexar contexto do time ao request
    request.teamContext = {
      teamId,
      role: membership.role as TeamRole,
    }
  }
}

// ============================================
// Helpers para verificação em services
// ============================================

export async function verifyTeamMembership(
  userId: string,
  teamId: string,
  requiredRole: TeamRole = 'VIEWER'
): Promise<{ valid: boolean; role?: TeamRole; error?: string }> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
  })

  if (!membership) {
    return { valid: false, error: 'Não é membro do time' }
  }

  const userRole = membership.role as TeamRole
  if (!hasTeamRole(userRole, requiredRole)) {
    return { valid: false, role: userRole, error: 'Permissão insuficiente' }
  }

  return { valid: true, role: userRole }
}

// ============================================
// Middleware helpers para uso em rotas
// ============================================

/**
 * Middleware que requer acesso ao time (qualquer role)
 */
export const requireTeamAccess = createTeamAuthHook('VIEWER')

/**
 * Factory para criar middleware que requer uma role específica
 */
export function requireTeamRole(role: TeamRole) {
  return createTeamAuthHook(role)
}
