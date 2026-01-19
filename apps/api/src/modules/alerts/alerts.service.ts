import { prisma } from '../../lib/prisma.js'
import { sendNotification } from '../../services/notification.service.js'
import { checkChannelAllowed } from '../plans/limits.service.js'
import type {
  CreateAlertChannelInput,
  UpdateAlertChannelInput,
  ListAlertChannelsQuery,
  EmailConfig,
  WebhookConfig,
  SlackConfig,
  WhatsAppConfig,
  TelegramConfig,
} from './alerts.schema.js'

// ============================================
// Serviço de Alert Channels - CRUD
// Atualizado para usar teamId em vez de userId
// ============================================

export async function createAlertChannel(teamId: string, data: CreateAlertChannelInput) {
  // Verifica se o tipo de canal é permitido pelo plano
  const channelCheck = await checkChannelAllowed(teamId, data.type)
  if (!channelCheck.allowed) {
    throw new Error(channelCheck.message || `Canal "${data.type}" não disponível no seu plano`)
  }

  const channel = await prisma.alertChannel.create({
    data: {
      name: data.name,
      type: data.type,
      config: data.config as object,
      active: data.active,
      teamId,
    },
  })

  return channel
}

export async function findAllAlertChannels(teamId: string, query: ListAlertChannelsQuery) {
  const where: { teamId: string; active?: boolean; type?: string } = { teamId }

  if (query.active !== undefined) {
    where.active = query.active === 'true'
  }

  if (query.type) {
    where.type = query.type
  }

  const [channels, total] = await Promise.all([
    prisma.alertChannel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.alertChannel.count({ where }),
  ])

  return {
    channels,
    total,
    limit: query.limit,
    offset: query.offset,
  }
}

export async function findAlertChannelById(teamId: string, id: string) {
  const channel = await prisma.alertChannel.findFirst({
    where: { id, teamId },
  })

  return channel
}

export async function updateAlertChannel(
  teamId: string,
  id: string,
  data: UpdateAlertChannelInput
) {
  const existing = await prisma.alertChannel.findFirst({
    where: { id, teamId },
  })

  if (!existing) {
    return null
  }

  const channel = await prisma.alertChannel.update({
    where: { id },
    data: {
      name: data.name,
      config: data.config as object | undefined,
      active: data.active,
    },
  })

  return channel
}

export async function deleteAlertChannel(teamId: string, id: string) {
  const existing = await prisma.alertChannel.findFirst({
    where: { id, teamId },
  })

  if (!existing) {
    return false
  }

  await prisma.alertChannel.delete({
    where: { id },
  })

  return true
}

// Busca todos os canais ativos de um time (para enviar alertas)
export async function findActiveChannelsByTeamId(teamId: string) {
  return prisma.alertChannel.findMany({
    where: { teamId, active: true },
  })
}

// Registra um alerta enviado
export async function createAlert(
  monitorId: string,
  alertChannelId: string,
  type: 'up' | 'down' | 'degraded',
  message: string
) {
  return prisma.alert.create({
    data: {
      monitorId,
      alertChannelId,
      type,
      message,
    },
  })
}

// Busca último alerta de um monitor (para evitar spam)
export async function findLastAlert(monitorId: string) {
  return prisma.alert.findFirst({
    where: { monitorId },
    orderBy: { sentAt: 'desc' },
  })
}

// Envia notificação de teste para um canal
export async function sendTestNotification(channel: {
  id: string
  type: string
  config: unknown
}): Promise<{ success: boolean; error?: string }> {
  try {
    const testPayload = {
      monitorName: 'Monitor de Teste',
      monitorUrl: 'https://exemplo.com',
      status: 'up' as const,
      message: 'Esta é uma notificação de teste do Taco Monitoring. Se você recebeu esta mensagem, o canal está configurado corretamente!',
      checkedAt: new Date(),
      latency: 123,
    }

    const config = channel.config as EmailConfig | WebhookConfig | SlackConfig | WhatsAppConfig | TelegramConfig

    const success = await sendNotification(
      channel.type as 'email' | 'webhook' | 'slack' | 'whatsapp' | 'telegram',
      config,
      testPayload
    )

    if (!success) {
      return { success: false, error: 'Falha ao enviar notificação' }
    }

    return { success: true }
  } catch (error) {
    console.error('Erro ao enviar notificação de teste:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
