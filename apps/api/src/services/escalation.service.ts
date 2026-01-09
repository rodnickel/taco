import { prisma } from '../lib/prisma.js'
import { sendNotification } from './notification.service.js'
import type {
  CreateEscalationPolicyInput,
  UpdateEscalationPolicyInput,
} from '../modules/alerts/alerts.schema.js'

// ============================================
// Serviço de Escalonamento de Alertas
// ============================================

// Cria uma política de escalonamento
export async function createEscalationPolicy(
  teamId: string,
  data: CreateEscalationPolicyInput
) {
  const policy = await prisma.escalationPolicy.create({
    data: {
      name: data.name,
      description: data.description,
      active: data.active,
      teamId,
      levels: {
        create: data.levels.map((level) => ({
          level: level.level,
          channelId: level.channelId,
          delayMinutes: level.delayMinutes,
          repeatCount: level.repeatCount,
          repeatInterval: level.repeatInterval,
        })),
      },
    },
    include: {
      levels: {
        include: { channel: true },
        orderBy: { level: 'asc' },
      },
    },
  })

  return policy
}

// Busca todas as políticas de um time
export async function findAllEscalationPolicies(teamId: string) {
  return prisma.escalationPolicy.findMany({
    where: { teamId },
    include: {
      levels: {
        include: { channel: true },
        orderBy: { level: 'asc' },
      },
      _count: { select: { monitors: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// Busca uma política por ID
export async function findEscalationPolicyById(teamId: string, id: string) {
  return prisma.escalationPolicy.findFirst({
    where: { id, teamId },
    include: {
      levels: {
        include: { channel: true },
        orderBy: { level: 'asc' },
      },
      monitors: {
        select: { id: true, name: true },
      },
    },
  })
}

// Atualiza uma política
export async function updateEscalationPolicy(
  teamId: string,
  id: string,
  data: UpdateEscalationPolicyInput
) {
  const existing = await prisma.escalationPolicy.findFirst({
    where: { id, teamId },
  })

  if (!existing) {
    return null
  }

  // Se levels foi fornecido, recria todos os níveis
  if (data.levels) {
    await prisma.escalationLevel.deleteMany({
      where: { policyId: id },
    })
  }

  const policy = await prisma.escalationPolicy.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      active: data.active,
      ...(data.levels
        ? {
            levels: {
              create: data.levels.map((level) => ({
                level: level.level,
                channelId: level.channelId,
                delayMinutes: level.delayMinutes,
                repeatCount: level.repeatCount,
                repeatInterval: level.repeatInterval,
              })),
            },
          }
        : {}),
    },
    include: {
      levels: {
        include: { channel: true },
        orderBy: { level: 'asc' },
      },
    },
  })

  return policy
}

// Deleta uma política
export async function deleteEscalationPolicy(teamId: string, id: string) {
  const existing = await prisma.escalationPolicy.findFirst({
    where: { id, teamId },
  })

  if (!existing) {
    return false
  }

  await prisma.escalationPolicy.delete({
    where: { id },
  })

  return true
}

// ============================================
// Lógica de Escalonamento
// ============================================

// Inicia escalonamento para um incidente
export async function startEscalation(incidentId: string, monitorId: string) {
  // Busca o monitor e sua política de escalonamento
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
    include: {
      escalationPolicy: {
        include: {
          levels: {
            include: { channel: true },
            orderBy: { level: 'asc' },
          },
        },
      },
    },
  })

  if (!monitor?.escalationPolicy?.active) {
    return null // Sem política de escalonamento configurada
  }

  const firstLevel = monitor.escalationPolicy.levels[0]
  if (!firstLevel) {
    return null
  }

  // Cria o registro de escalonamento pendente
  const escalation = await prisma.pendingEscalation.create({
    data: {
      incidentId,
      currentLevel: 1,
      attemptCount: 0,
      nextAttemptAt: new Date(Date.now() + firstLevel.delayMinutes * 60 * 1000),
    },
  })

  console.log(`🔔 Escalonamento iniciado para incidente ${incidentId}`)
  return escalation
}

// Para escalonamento quando incidente é resolvido ou reconhecido
export async function stopEscalation(incidentId: string) {
  await prisma.pendingEscalation.updateMany({
    where: {
      incidentId,
      completedAt: null,
    },
    data: {
      completedAt: new Date(),
      acknowledged: true,
    },
  })

  console.log(`✅ Escalonamento parado para incidente ${incidentId}`)
}

// Processa escalonamentos pendentes (chamado pelo worker)
export async function processEscalations() {
  const now = new Date()

  // Busca escalonamentos pendentes que precisam ser processados
  const pendingEscalations = await prisma.pendingEscalation.findMany({
    where: {
      completedAt: null,
      acknowledged: false,
      nextAttemptAt: { lte: now },
    },
  })

  for (const escalation of pendingEscalations) {
    await processEscalation(escalation)
  }

  return pendingEscalations.length
}

// Processa um escalonamento individual
async function processEscalation(escalation: {
  id: string
  incidentId: string
  currentLevel: number
  attemptCount: number
}) {
  // Busca o incidente e informações relacionadas
  const incident = await prisma.incident.findUnique({
    where: { id: escalation.incidentId },
    include: {
      monitor: {
        include: {
          escalationPolicy: {
            include: {
              levels: {
                include: { channel: true },
                orderBy: { level: 'asc' },
              },
            },
          },
        },
      },
    },
  })

  if (!incident) {
    // Incidente não existe mais, para escalonamento
    await prisma.pendingEscalation.update({
      where: { id: escalation.id },
      data: { completedAt: new Date() },
    })
    return
  }

  // Se incidente foi resolvido ou reconhecido, para escalonamento
  if (incident.status === 'resolved' || incident.status === 'acknowledged') {
    await stopEscalation(escalation.incidentId)
    return
  }

  const policy = incident.monitor.escalationPolicy
  if (!policy) {
    return
  }

  // Busca o nível atual
  const currentLevelConfig = policy.levels.find(
    (l) => l.level === escalation.currentLevel
  )
  if (!currentLevelConfig) {
    return
  }

  // Envia notificação
  const payload = {
    monitorName: incident.monitor.name,
    monitorUrl: incident.monitor.url,
    status: 'down' as const,
    message: `[Escalonamento Nível ${escalation.currentLevel}] ${incident.cause || 'Monitor indisponível'}`,
    checkedAt: new Date(),
  }

  await sendNotification(
    currentLevelConfig.channel.type as 'email' | 'webhook' | 'slack' | 'whatsapp' | 'telegram',
    currentLevelConfig.channel.config as Record<string, string>,
    payload
  )

  console.log(
    `🔔 Notificação de escalonamento enviada - Nível ${escalation.currentLevel}, ` +
      `Canal: ${currentLevelConfig.channel.name}`
  )

  // Atualiza contador de tentativas
  const newAttemptCount = escalation.attemptCount + 1

  // Verifica se deve repetir no mesmo nível ou escalar
  if (newAttemptCount < currentLevelConfig.repeatCount) {
    // Repetir no mesmo nível
    await prisma.pendingEscalation.update({
      where: { id: escalation.id },
      data: {
        attemptCount: newAttemptCount,
        nextAttemptAt: new Date(
          Date.now() + currentLevelConfig.repeatInterval * 60 * 1000
        ),
      },
    })
  } else {
    // Escalar para próximo nível
    const nextLevel = policy.levels.find(
      (l) => l.level === escalation.currentLevel + 1
    )

    if (nextLevel) {
      // Há próximo nível, escala
      await prisma.pendingEscalation.update({
        where: { id: escalation.id },
        data: {
          currentLevel: nextLevel.level,
          attemptCount: 0,
          nextAttemptAt: new Date(Date.now() + nextLevel.delayMinutes * 60 * 1000),
        },
      })
      console.log(`⬆️ Escalonado para nível ${nextLevel.level}`)
    } else {
      // Último nível alcançado, reinicia do primeiro ou para
      // Vamos reiniciar do primeiro nível para continuar alertando
      const firstLevel = policy.levels[0]
      if (firstLevel) {
        await prisma.pendingEscalation.update({
          where: { id: escalation.id },
          data: {
            currentLevel: 1,
            attemptCount: 0,
            nextAttemptAt: new Date(
              Date.now() + firstLevel.delayMinutes * 60 * 1000
            ),
          },
        })
        console.log(`🔄 Escalonamento reiniciado do nível 1`)
      }
    }
  }
}
