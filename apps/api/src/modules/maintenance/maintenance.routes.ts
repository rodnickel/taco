import type { FastifyInstance, FastifyRequest } from 'fastify'
import { requireTeamRole, requireTeamAccess } from '../../lib/team-auth.js'
import {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  listMaintenanceQuerySchema,
} from './maintenance.schema.js'
import {
  createMaintenance,
  findAllMaintenance,
  findMaintenanceById,
  updateMaintenance,
  deleteMaintenance,
} from './maintenance.service.js'

// ============================================
// Rotas de Maintenance Windows
// ============================================

export async function maintenanceRoutes(app: FastifyInstance) {
  // Lista janelas de manutenção
  app.get(
    '/',
    { preHandler: requireTeamAccess },
    async (request: FastifyRequest, reply) => {
      const teamId = request.teamContext!.teamId

      const queryValidation = listMaintenanceQuerySchema.safeParse(request.query)
      if (!queryValidation.success) {
        return reply.status(400).send({
          error: 'Parâmetros inválidos',
          code: 'VALIDATION_ERROR',
          details: queryValidation.error.errors,
        })
      }

      const result = await findAllMaintenance(teamId, queryValidation.data)

      return reply.send(result)
    }
  )

  // Busca uma janela por ID
  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireTeamAccess },
    async (request, reply) => {
      const teamId = request.teamContext!.teamId
      const { id } = request.params

      const maintenance = await findMaintenanceById(teamId, id)

      if (!maintenance) {
        return reply.status(404).send({
          error: 'Janela de manutenção não encontrada',
          code: 'NOT_FOUND',
        })
      }

      return reply.send(maintenance)
    }
  )

  // Cria uma janela de manutenção
  app.post(
    '/',
    { preHandler: requireTeamRole('EDITOR') },
    async (request: FastifyRequest, reply) => {
      const teamId = request.teamContext!.teamId

      const validation = createMaintenanceSchema.safeParse(request.body)
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: validation.error.errors,
        })
      }

      const maintenance = await createMaintenance(teamId, validation.data)

      return reply.status(201).send(maintenance)
    }
  )

  // Atualiza uma janela
  app.put<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireTeamRole('EDITOR') },
    async (request, reply) => {
      const teamId = request.teamContext!.teamId
      const { id } = request.params

      const validation = updateMaintenanceSchema.safeParse(request.body)
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: validation.error.errors,
        })
      }

      const maintenance = await updateMaintenance(teamId, id, validation.data)

      if (!maintenance) {
        return reply.status(404).send({
          error: 'Janela de manutenção não encontrada',
          code: 'NOT_FOUND',
        })
      }

      return reply.send(maintenance)
    }
  )

  // Cancela/encerra uma janela de manutenção
  app.post<{ Params: { id: string } }>(
    '/:id/cancel',
    { preHandler: requireTeamRole('EDITOR') },
    async (request, reply) => {
      const teamId = request.teamContext!.teamId
      const { id } = request.params

      const maintenance = await updateMaintenance(teamId, id, { active: false })

      if (!maintenance) {
        return reply.status(404).send({
          error: 'Janela de manutenção não encontrada',
          code: 'NOT_FOUND',
        })
      }

      return reply.send(maintenance)
    }
  )

  // Deleta uma janela
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireTeamRole('ADMIN') },
    async (request, reply) => {
      const teamId = request.teamContext!.teamId
      const { id } = request.params

      const deleted = await deleteMaintenance(teamId, id)

      if (!deleted) {
        return reply.status(404).send({
          error: 'Janela de manutenção não encontrada',
          code: 'NOT_FOUND',
        })
      }

      return reply.status(204).send()
    }
  )
}
