import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireTeamAccess, requireTeamRole } from '../../lib/team-auth.js'
import {
  incidentIdSchema,
  listIncidentsQuerySchema,
  addIncidentUpdateSchema,
  resolveIncidentSchema,
} from './incidents.schema.js'
import * as incidentsService from './incidents.service.js'

// ============================================
// Rotas de Incidents
// ============================================

export async function incidentsRoutes(fastify: FastifyInstance) {
  // ----------------------------------------
  // GET /incidents - Lista incidentes do time
  // ----------------------------------------
  fastify.get(
    '/',
    {
      preHandler: [requireTeamAccess],
    },
    async (
      request: FastifyRequest<{ Querystring: Record<string, string> }>,
      reply: FastifyReply
    ) => {
      const teamId = request.teamContext!.teamId
      const queryResult = listIncidentsQuerySchema.safeParse(request.query)

      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Parametros invalidos',
          code: 'VALIDATION_ERROR',
          details: queryResult.error.errors,
        })
      }

      const result = await incidentsService.listIncidents(teamId, queryResult.data)
      return reply.send(result)
    }
  )

  // ----------------------------------------
  // GET /incidents/count - Conta incidentes em andamento
  // ----------------------------------------
  fastify.get(
    '/count',
    {
      preHandler: [requireTeamAccess],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const teamId = request.teamContext!.teamId
      const count = await incidentsService.countOngoingIncidents(teamId)
      return reply.send({ count })
    }
  )

  // ----------------------------------------
  // GET /incidents/:id - Detalhes de um incidente
  // ----------------------------------------
  fastify.get(
    '/:id',
    {
      preHandler: [requireTeamAccess],
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const teamId = request.teamContext!.teamId
      const paramsResult = incidentIdSchema.safeParse(request.params)

      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'ID invalido',
          code: 'VALIDATION_ERROR',
        })
      }

      const incident = await incidentsService.getIncidentById(
        paramsResult.data.id,
        teamId
      )

      if (!incident) {
        return reply.status(404).send({
          error: 'Incidente nao encontrado',
          code: 'NOT_FOUND',
        })
      }

      return reply.send(incident)
    }
  )

  // ----------------------------------------
  // POST /incidents/:id/acknowledge - Reconhece um incidente
  // ----------------------------------------
  fastify.post(
    '/:id/acknowledge',
    {
      preHandler: [requireTeamRole('VIEWER')], // Qualquer membro pode acknowledgar
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const teamId = request.teamContext!.teamId
      const userId = request.user!.id
      const paramsResult = incidentIdSchema.safeParse(request.params)

      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'ID invalido',
          code: 'VALIDATION_ERROR',
        })
      }

      try {
        const incident = await incidentsService.acknowledgeIncident(
          paramsResult.data.id,
          userId,
          teamId
        )
        return reply.send(incident)
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Erro ao reconhecer incidente',
          code: 'ACKNOWLEDGE_ERROR',
        })
      }
    }
  )

  // ----------------------------------------
  // POST /incidents/:id/resolve - Resolve um incidente
  // ----------------------------------------
  fastify.post(
    '/:id/resolve',
    {
      preHandler: [requireTeamRole('EDITOR')], // Editor ou Admin pode resolver
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { message?: string } }>,
      reply: FastifyReply
    ) => {
      const teamId = request.teamContext!.teamId
      const paramsResult = incidentIdSchema.safeParse(request.params)
      const bodyResult = resolveIncidentSchema.safeParse(request.body || {})

      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'ID invalido',
          code: 'VALIDATION_ERROR',
        })
      }

      try {
        const incident = await incidentsService.resolveIncident(
          paramsResult.data.id,
          teamId,
          bodyResult.success ? bodyResult.data.message : undefined
        )
        return reply.send(incident)
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Erro ao resolver incidente',
          code: 'RESOLVE_ERROR',
        })
      }
    }
  )

  // ----------------------------------------
  // POST /incidents/:id/updates - Adiciona update ao incidente
  // ----------------------------------------
  fastify.post(
    '/:id/updates',
    {
      preHandler: [requireTeamRole('EDITOR')],
    },
    async (
      request: FastifyRequest<{
        Params: { id: string }
        Body: { message: string; status?: string }
      }>,
      reply: FastifyReply
    ) => {
      const teamId = request.teamContext!.teamId
      const paramsResult = incidentIdSchema.safeParse(request.params)
      const bodyResult = addIncidentUpdateSchema.safeParse(request.body)

      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'ID invalido',
          code: 'VALIDATION_ERROR',
        })
      }

      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Dados invalidos',
          code: 'VALIDATION_ERROR',
          details: bodyResult.error.errors,
        })
      }

      try {
        const update = await incidentsService.addIncidentUpdate(
          paramsResult.data.id,
          teamId,
          bodyResult.data
        )
        return reply.send(update)
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Erro ao adicionar update',
          code: 'UPDATE_ERROR',
        })
      }
    }
  )
}
