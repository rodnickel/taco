import type { FastifyInstance } from 'fastify'
import * as webhooksService from './webhooks.service.js'
import { webhookUpdateSchema } from './webhooks.schema.js'

// ============================================
// Rotas Públicas de Webhook (sem autenticação)
// ============================================

export async function webhooksRoutes(app: FastifyInstance) {
  // POST /webhooks/:token - Recebe atualização de status via webhook
  app.post<{ Params: { token: string } }>('/:token', async (request, reply) => {
    const { token } = request.params

    // Valida o body
    const parseResult = webhookUpdateSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Dados inválidos',
        details: parseResult.error.errors,
      })
    }

    const result = await webhooksService.processWebhookUpdate(token, parseResult.data, request.headers)

    if (!result.success) {
      return reply.status(result.status || 400).send({
        error: result.error,
      })
    }

    return reply.status(200).send({
      success: true,
      monitor: {
        id: result.monitor!.id,
        name: result.monitor!.name,
        status: result.monitor!.currentStatus,
      },
    })
  })

  // GET /webhooks/:token/heartbeat - Endpoint de heartbeat (opcional)
  app.get<{ Params: { token: string } }>('/:token/heartbeat', async (request, reply) => {
    const { token } = request.params

    const result = await webhooksService.processHeartbeat(token)

    if (!result.success) {
      return reply.status(result.status || 400).send({
        error: result.error,
      })
    }

    return reply.status(200).send({
      success: true,
      monitor: {
        id: result.monitor!.id,
        name: result.monitor!.name,
        lastHeartbeat: result.monitor!.lastHeartbeat,
      },
    })
  })
}
