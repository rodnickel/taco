import type { FastifyInstance } from 'fastify'
import {
  createMonitorSchema,
  updateMonitorSchema,
  monitorIdSchema,
  listMonitorsQuerySchema,
} from './monitors.schema.js'
import * as monitorsService from './monitors.service.js'
import { createTeamAuthHook } from '../../lib/team-auth.js'
import { checkMonitorSSL } from '../../services/ssl-check.service.js'

// ============================================
// Rotas de Monitors - CRUD completo
// Atualizado para usar autenticação por time
// ============================================

export async function monitorsRoutes(app: FastifyInstance) {
  // Todas as rotas de monitors requerem autenticação e contexto de time
  // VIEWER pode ler, EDITOR pode criar/editar/deletar

  // Hook para rotas de leitura (VIEWER)
  const viewerAuth = createTeamAuthHook('VIEWER')
  // Hook para rotas de escrita (EDITOR)
  const editorAuth = createTeamAuthHook('EDITOR')

  // POST /monitors - Criar novo monitor (requer EDITOR)
  app.post('/', { onRequest: [editorAuth] }, async (request, reply) => {
    const parseResult = createMonitorSchema.safeParse(request.body)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Dados inválidos',
        details: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
    }

    const monitor = await monitorsService.createMonitor(
      request.teamContext!.teamId,
      parseResult.data
    )

    return reply.status(201).send(monitor)
  })

  // GET /monitors - Listar monitors do time (requer VIEWER)
  app.get('/', { onRequest: [viewerAuth] }, async (request, reply) => {
    const parseResult = listMonitorsQuerySchema.safeParse(request.query)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Parâmetros inválidos',
        details: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
    }

    const result = await monitorsService.findAllMonitorsWithStatus(
      request.teamContext!.teamId,
      parseResult.data
    )

    return reply.send(result)
  })

  // GET /monitors/:id - Buscar monitor por ID (requer VIEWER)
  app.get('/:id', { onRequest: [viewerAuth] }, async (request, reply) => {
    const parseResult = monitorIdSchema.safeParse(request.params)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'ID inválido',
      })
    }

    const monitor = await monitorsService.getMonitorWithStatus(
      request.teamContext!.teamId,
      parseResult.data.id
    )

    if (!monitor) {
      return reply.status(404).send({
        error: 'Monitor não encontrado',
      })
    }

    return reply.send(monitor)
  })

  // PUT /monitors/:id - Atualizar monitor (requer EDITOR)
  app.put('/:id', { onRequest: [editorAuth] }, async (request, reply) => {
    const idResult = monitorIdSchema.safeParse(request.params)

    if (!idResult.success) {
      return reply.status(400).send({
        error: 'ID inválido',
      })
    }

    const bodyResult = updateMonitorSchema.safeParse(request.body)

    if (!bodyResult.success) {
      return reply.status(400).send({
        error: 'Dados inválidos',
        details: bodyResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
    }

    const monitor = await monitorsService.updateMonitor(
      request.teamContext!.teamId,
      idResult.data.id,
      bodyResult.data
    )

    if (!monitor) {
      return reply.status(404).send({
        error: 'Monitor não encontrado',
      })
    }

    return reply.send(monitor)
  })

  // GET /monitors/:id/history - Histórico de uptime do monitor (requer VIEWER)
  app.get('/:id/history', { onRequest: [viewerAuth] }, async (request, reply) => {
    const parseResult = monitorIdSchema.safeParse(request.params)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'ID inválido',
      })
    }

    // Query param para número de dias (padrão 90)
    const query = request.query as { days?: string }
    const days = query.days ? parseInt(query.days, 10) : 90

    if (isNaN(days) || days < 1 || days > 365) {
      return reply.status(400).send({
        error: 'Parâmetro days deve ser entre 1 e 365',
      })
    }

    const history = await monitorsService.getMonitorHistory(
      request.teamContext!.teamId,
      parseResult.data.id,
      days
    )

    if (!history) {
      return reply.status(404).send({
        error: 'Monitor não encontrado',
      })
    }

    return reply.send({ history, days })
  })

  // DELETE /monitors/:id - Deletar monitor (requer EDITOR)
  app.delete('/:id', { onRequest: [editorAuth] }, async (request, reply) => {
    const parseResult = monitorIdSchema.safeParse(request.params)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'ID inválido',
      })
    }

    const deleted = await monitorsService.deleteMonitor(
      request.teamContext!.teamId,
      parseResult.data.id
    )

    if (!deleted) {
      return reply.status(404).send({
        error: 'Monitor não encontrado',
      })
    }

    return reply.status(204).send()
  })

  // GET /monitors/:id/ssl - Verificar certificado SSL do monitor (requer VIEWER)
  app.get('/:id/ssl', { onRequest: [viewerAuth] }, async (request, reply) => {
    const parseResult = monitorIdSchema.safeParse(request.params)

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'ID inválido',
      })
    }

    // Verifica se o monitor existe e pertence ao time
    const monitor = await monitorsService.findMonitorById(
      request.teamContext!.teamId,
      parseResult.data.id
    )

    if (!monitor) {
      return reply.status(404).send({
        error: 'Monitor não encontrado',
      })
    }

    // Verifica o certificado SSL
    const sslInfo = await checkMonitorSSL(parseResult.data.id)

    if (!sslInfo) {
      return reply.status(500).send({
        error: 'Erro ao verificar certificado SSL',
      })
    }

    return reply.send({
      monitorId: monitor.id,
      monitorName: monitor.name,
      url: monitor.url,
      ssl: sslInfo,
    })
  })
}
