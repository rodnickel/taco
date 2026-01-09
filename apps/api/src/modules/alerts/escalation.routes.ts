import type { FastifyInstance, FastifyRequest } from 'fastify'
import { requireTeamRole, requireTeamAccess } from '../../lib/team-auth.js'
import {
  createEscalationPolicySchema,
  updateEscalationPolicySchema,
} from './alerts.schema.js'
import {
  createEscalationPolicy,
  findAllEscalationPolicies,
  findEscalationPolicyById,
  updateEscalationPolicy,
  deleteEscalationPolicy,
} from '../../services/escalation.service.js'

// ============================================
// Rotas de Escalation Policies
// ============================================

export async function escalationRoutes(app: FastifyInstance) {
  // Lista políticas de escalonamento
  app.get(
    '/escalation-policies',
    { preHandler: requireTeamAccess },
    async (request: FastifyRequest, reply) => {
      const teamId = request.teamContext!.teamId

      const policies = await findAllEscalationPolicies(teamId)

      return reply.send(policies)
    }
  )

  // Busca uma política por ID
  app.get<{ Params: { id: string } }>(
    '/escalation-policies/:id',
    { preHandler: requireTeamAccess },
    async (request, reply) => {
      const teamId = request.teamContext!.teamId
      const { id } = request.params

      const policy = await findEscalationPolicyById(teamId, id)

      if (!policy) {
        return reply.status(404).send({
          error: 'Política de escalonamento não encontrada',
          code: 'NOT_FOUND',
        })
      }

      return reply.send(policy)
    }
  )

  // Cria uma política de escalonamento
  app.post(
    '/escalation-policies',
    { preHandler: requireTeamRole('EDITOR') },
    async (request: FastifyRequest, reply) => {
      const teamId = request.teamContext!.teamId

      const validation = createEscalationPolicySchema.safeParse(request.body)
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: validation.error.errors,
        })
      }

      const policy = await createEscalationPolicy(teamId, validation.data)

      return reply.status(201).send(policy)
    }
  )

  // Atualiza uma política
  app.put<{ Params: { id: string } }>(
    '/escalation-policies/:id',
    { preHandler: requireTeamRole('EDITOR') },
    async (request, reply) => {
      const teamId = request.teamContext!.teamId
      const { id } = request.params

      const validation = updateEscalationPolicySchema.safeParse(request.body)
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: validation.error.errors,
        })
      }

      const policy = await updateEscalationPolicy(teamId, id, validation.data)

      if (!policy) {
        return reply.status(404).send({
          error: 'Política de escalonamento não encontrada',
          code: 'NOT_FOUND',
        })
      }

      return reply.send(policy)
    }
  )

  // Deleta uma política
  app.delete<{ Params: { id: string } }>(
    '/escalation-policies/:id',
    { preHandler: requireTeamRole('ADMIN') },
    async (request, reply) => {
      const teamId = request.teamContext!.teamId
      const { id } = request.params

      const deleted = await deleteEscalationPolicy(teamId, id)

      if (!deleted) {
        return reply.status(404).send({
          error: 'Política de escalonamento não encontrada',
          code: 'NOT_FOUND',
        })
      }

      return reply.status(204).send()
    }
  )
}
