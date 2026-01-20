import { prisma } from '../../lib/prisma.js'
import type { WebhookUpdateInput } from './webhooks.schema.js'
import crypto from 'node:crypto'
import type { FastifyRequest } from 'fastify'

interface ProcessResult {
  success: boolean
  error?: string
  status?: number
  monitor?: {
    id: string
    name: string
    currentStatus: string | null
    lastHeartbeat?: Date | null
  }
}

// ============================================
// Processa atualização de status via webhook
// ============================================

export async function processWebhookUpdate(
  token: string,
  data: WebhookUpdateInput,
  headers: FastifyRequest['headers']
): Promise<ProcessResult> {
  // Busca o monitor pelo token
  const monitor = await prisma.monitor.findUnique({
    where: { webhookToken: token },
    include: {
      team: true,
    },
  })

  if (!monitor) {
    return {
      success: false,
      error: 'Monitor não encontrado ou token inválido',
      status: 404,
    }
  }

  // Verifica se é um monitor do tipo webhook
  if (monitor.type !== 'webhook') {
    return {
      success: false,
      error: 'Este monitor não é do tipo webhook',
      status: 400,
    }
  }

  // Verifica se o monitor está ativo
  if (!monitor.active) {
    return {
      success: false,
      error: 'Monitor inativo',
      status: 403,
    }
  }

  // Valida assinatura HMAC se configurado
  if (monitor.webhookSecret) {
    const signature = headers['x-webhook-signature'] as string
    if (!signature) {
      return {
        success: false,
        error: 'Assinatura webhook ausente',
        status: 401,
      }
    }

    // Valida a assinatura
    const body = JSON.stringify(data)
    const expectedSignature = crypto
      .createHmac('sha256', monitor.webhookSecret)
      .update(body)
      .digest('hex')

    if (signature !== expectedSignature) {
      return {
        success: false,
        error: 'Assinatura webhook inválida',
        status: 401,
      }
    }
  }

  const previousStatus = monitor.currentStatus
  const newStatus = data.status

  // Atualiza o monitor
  const updatedMonitor = await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      currentStatus: newStatus,
      lastCheck: new Date(),
      lastHeartbeat: new Date(), // Atualiza heartbeat também
      consecutiveFails: newStatus === 'down' ? monitor.consecutiveFails + 1 : 0,
    },
  })

  // Cria um Check registro
  await prisma.check.create({
    data: {
      monitorId: monitor.id,
      status: newStatus,
      statusCode: null, // Webhook não tem status code HTTP
      latency: 0,
      checkedAt: new Date(),
      responseTime: 0,
      error: data.message || null,
    },
  })

  // Se o status mudou e alertas estão habilitados, processa alertas
  if (previousStatus !== newStatus && monitor.alertsEnabled) {
    await processStatusChange(monitor.id, monitor.teamId, previousStatus, newStatus, data.message)
  }

  return {
    success: true,
    monitor: {
      id: updatedMonitor.id,
      name: updatedMonitor.name,
      currentStatus: updatedMonitor.currentStatus,
    },
  }
}

// ============================================
// Processa heartbeat
// ============================================

export async function processHeartbeat(token: string): Promise<ProcessResult> {
  // Busca o monitor pelo token
  const monitor = await prisma.monitor.findUnique({
    where: { webhookToken: token },
  })

  if (!monitor) {
    return {
      success: false,
      error: 'Monitor não encontrado ou token inválido',
      status: 404,
    }
  }

  // Verifica se é um monitor do tipo webhook
  if (monitor.type !== 'webhook') {
    return {
      success: false,
      error: 'Este monitor não é do tipo webhook',
      status: 400,
    }
  }

  // Verifica se o monitor está ativo
  if (!monitor.active) {
    return {
      success: false,
      error: 'Monitor inativo',
      status: 403,
    }
  }

  // Atualiza o lastHeartbeat
  const updatedMonitor = await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      lastHeartbeat: new Date(),
      // Se estava DOWN e recebeu heartbeat, marca como UP
      currentStatus: monitor.currentStatus === 'down' ? 'up' : monitor.currentStatus,
    },
  })

  return {
    success: true,
    monitor: {
      id: updatedMonitor.id,
      name: updatedMonitor.name,
      currentStatus: updatedMonitor.currentStatus,
      lastHeartbeat: updatedMonitor.lastHeartbeat,
    },
  }
}

// ============================================
// Processa mudança de status (alertas e incidentes)
// ============================================

async function processStatusChange(
  monitorId: string,
  teamId: string,
  previousStatus: string | null,
  newStatus: string,
  message?: string
) {
  // Se mudou de UP/DEGRADED para DOWN, cria incidente
  if ((previousStatus === 'up' || previousStatus === 'degraded') && newStatus === 'down') {
    // Verifica se já existe incidente ongoing
    const existingIncident = await prisma.incident.findFirst({
      where: {
        monitorId,
        status: {
          in: ['ongoing', 'acknowledged'],
        },
      },
    })

    if (!existingIncident) {
      await prisma.incident.create({
        data: {
          title: 'Monitor Webhook - Status Down',
          cause: message || 'Status alterado para DOWN via webhook',
          status: 'ongoing',
          startedAt: new Date(),
          monitorId,
          teamId,
        },
      })
    }
  }

  // Se mudou de DOWN para UP, resolve incidente
  if (previousStatus === 'down' && newStatus === 'up') {
    const ongoingIncident = await prisma.incident.findFirst({
      where: {
        monitorId,
        status: {
          in: ['ongoing', 'acknowledged'],
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    })

    if (ongoingIncident) {
      const now = new Date()
      const duration = Math.floor((now.getTime() - ongoingIncident.startedAt.getTime()) / 1000)

      await prisma.incident.update({
        where: { id: ongoingIncident.id },
        data: {
          status: 'resolved',
          resolvedAt: now,
          duration,
        },
      })
    }
  }

  // Busca e dispara os alertas configurados
  const alerts = await prisma.alert.findMany({
    where: {
      monitorId,
      active: true,
    },
    include: {
      monitor: true,
      team: true,
    },
  })

  // Dispara cada alerta (implementação futura - integração com canais)
  for (const alert of alerts) {
    console.log(`[Webhook] Alerta disparado: ${alert.name} - Monitor ${alert.monitor.name} mudou para ${newStatus}`)
    // TODO: Implementar disparo real dos alertas
  }
}

// ============================================
// Gera um token único para webhook
// ============================================

export function generateWebhookToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// ============================================
// Verifica monitores webhook com heartbeat expirado
// ============================================

export async function checkWebhookHeartbeats() {
  // Busca monitores webhook com heartbeat configurado
  const monitors = await prisma.monitor.findMany({
    where: {
      type: 'webhook',
      active: true,
      heartbeatInterval: {
        not: null,
      },
    },
  })

  const now = new Date()

  for (const monitor of monitors) {
    if (!monitor.heartbeatInterval || !monitor.lastHeartbeat) {
      continue
    }

    // Calcula tempo desde último heartbeat
    const secondsSinceHeartbeat = Math.floor((now.getTime() - monitor.lastHeartbeat.getTime()) / 1000)

    // Se passou do intervalo esperado + margem de 60s, marca como DOWN
    const threshold = monitor.heartbeatInterval + 60

    if (secondsSinceHeartbeat > threshold && monitor.currentStatus !== 'down') {
      console.log(`[Webhook] Monitor ${monitor.name} sem heartbeat há ${secondsSinceHeartbeat}s - marcando como DOWN`)

      const previousStatus = monitor.currentStatus

      // Atualiza status para DOWN
      await prisma.monitor.update({
        where: { id: monitor.id },
        data: {
          currentStatus: 'down',
          lastCheck: now,
          consecutiveFails: monitor.consecutiveFails + 1,
        },
      })

      // Cria check registro
      await prisma.check.create({
        data: {
          monitorId: monitor.id,
          status: 'down',
          statusCode: null,
          latency: 0,
          checkedAt: now,
          responseTime: 0,
          error: `Heartbeat expirado (${secondsSinceHeartbeat}s sem sinal)`,
        },
      })

      // Processa mudança de status
      if (monitor.alertsEnabled) {
        await processStatusChange(
          monitor.id,
          monitor.teamId,
          previousStatus,
          'down',
          `Heartbeat expirado (${secondsSinceHeartbeat}s sem sinal)`
        )
      }
    }
  }
}
