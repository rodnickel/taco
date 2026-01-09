import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireTeamAccess, requireTeamRole } from '../../lib/team-auth.js'
import {
  groupIdSchema,
  createGroupSchema,
  updateGroupSchema,
  addMonitorsToGroupSchema,
  removeMonitorsFromGroupSchema,
} from './groups.schema.js'
import * as groupsService from './groups.service.js'

// ============================================
// Rotas de Grupos de Monitores
// ============================================

export async function groupsRoutes(fastify: FastifyInstance) {
  // ----------------------------------------
  // GET /groups - Lista grupos do time
  // ----------------------------------------
  fastify.get(
    '/',
    {
      preHandler: [requireTeamAccess],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const teamId = request.teamContext!.teamId
      const groups = await groupsService.listGroups(teamId)
      return reply.send(groups)
    }
  )

  // ----------------------------------------
  // GET /groups/ungrouped - Lista monitores sem grupo
  // ----------------------------------------
  fastify.get(
    '/ungrouped',
    {
      preHandler: [requireTeamAccess],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const teamId = request.teamContext!.teamId
      const monitors = await groupsService.listUngroupedMonitors(teamId)
      return reply.send(monitors)
    }
  )

  // ----------------------------------------
  // GET /groups/:id - Detalhes de um grupo
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
      const paramsResult = groupIdSchema.safeParse(request.params)

      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'ID inválido',
          code: 'VALIDATION_ERROR',
        })
      }

      const group = await groupsService.getGroupById(paramsResult.data.id, teamId)

      if (!group) {
        return reply.status(404).send({
          error: 'Grupo não encontrado',
          code: 'NOT_FOUND',
        })
      }

      return reply.send(group)
    }
  )

  // ----------------------------------------
  // POST /groups - Criar grupo
  // ----------------------------------------
  fastify.post(
    '/',
    {
      preHandler: [requireTeamRole('EDITOR')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const teamId = request.teamContext!.teamId
      const bodyResult = createGroupSchema.safeParse(request.body)

      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: bodyResult.error.errors,
        })
      }

      const group = await groupsService.createGroup(teamId, bodyResult.data)
      return reply.status(201).send(group)
    }
  )

  // ----------------------------------------
  // PUT /groups/:id - Atualizar grupo
  // ----------------------------------------
  fastify.put(
    '/:id',
    {
      preHandler: [requireTeamRole('EDITOR')],
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const teamId = request.teamContext!.teamId
      const paramsResult = groupIdSchema.safeParse(request.params)
      const bodyResult = updateGroupSchema.safeParse(request.body)

      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'ID inválido',
          code: 'VALIDATION_ERROR',
        })
      }

      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: bodyResult.error.errors,
        })
      }

      const group = await groupsService.updateGroup(
        paramsResult.data.id,
        teamId,
        bodyResult.data
      )

      if (!group) {
        return reply.status(404).send({
          error: 'Grupo não encontrado',
          code: 'NOT_FOUND',
        })
      }

      return reply.send(group)
    }
  )

  // ----------------------------------------
  // DELETE /groups/:id - Deletar grupo
  // ----------------------------------------
  fastify.delete(
    '/:id',
    {
      preHandler: [requireTeamRole('ADMIN')],
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const teamId = request.teamContext!.teamId
      const paramsResult = groupIdSchema.safeParse(request.params)

      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'ID inválido',
          code: 'VALIDATION_ERROR',
        })
      }

      const deleted = await groupsService.deleteGroup(paramsResult.data.id, teamId)

      if (!deleted) {
        return reply.status(404).send({
          error: 'Grupo não encontrado',
          code: 'NOT_FOUND',
        })
      }

      return reply.status(204).send()
    }
  )

  // ----------------------------------------
  // POST /groups/:id/monitors - Adicionar monitores ao grupo
  // ----------------------------------------
  fastify.post(
    '/:id/monitors',
    {
      preHandler: [requireTeamRole('EDITOR')],
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const teamId = request.teamContext!.teamId
      const paramsResult = groupIdSchema.safeParse(request.params)
      const bodyResult = addMonitorsToGroupSchema.safeParse(request.body)

      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'ID inválido',
          code: 'VALIDATION_ERROR',
        })
      }

      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: bodyResult.error.errors,
        })
      }

      const group = await groupsService.addMonitorsToGroup(
        paramsResult.data.id,
        teamId,
        bodyResult.data.monitorIds
      )

      if (!group) {
        return reply.status(404).send({
          error: 'Grupo não encontrado',
          code: 'NOT_FOUND',
        })
      }

      return reply.send(group)
    }
  )

  // ----------------------------------------
  // DELETE /groups/:id/monitors - Remover monitores do grupo
  // ----------------------------------------
  fastify.delete(
    '/:id/monitors',
    {
      preHandler: [requireTeamRole('EDITOR')],
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const teamId = request.teamContext!.teamId
      const paramsResult = groupIdSchema.safeParse(request.params)
      const bodyResult = removeMonitorsFromGroupSchema.safeParse(request.body)

      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'ID inválido',
          code: 'VALIDATION_ERROR',
        })
      }

      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: bodyResult.error.errors,
        })
      }

      const group = await groupsService.removeMonitorsFromGroup(
        paramsResult.data.id,
        teamId,
        bodyResult.data.monitorIds
      )

      if (!group) {
        return reply.status(404).send({
          error: 'Grupo não encontrado',
          code: 'NOT_FOUND',
        })
      }

      return reply.send(group)
    }
  )
}
