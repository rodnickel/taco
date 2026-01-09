import { Worker, Queue } from 'bullmq'
import { redis } from '../lib/redis.js'
import { prisma } from '../lib/prisma.js'
import { findActiveChannelsByTeamId, createAlert } from '../modules/alerts/alerts.service.js'
import { sendNotification } from '../services/notification.service.js'
import { createIncident, autoResolveIncident } from '../modules/incidents/incidents.service.js'
import { startEscalation, stopEscalation } from '../services/escalation.service.js'
import {
  shouldSuppressAlerts,
  shouldSuppressIncidents,
  getActiveMaintenanceForMonitor,
} from '../modules/maintenance/maintenance.service.js'

// ============================================
// Worker de Verificação de Monitors
// ============================================

const QUEUE_NAME = 'monitor-checks'

// Fila para agendar verificações
export const monitorCheckQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100, // Mantém últimos 100 jobs completos
    removeOnFail: 50,      // Mantém últimos 50 jobs com falha
  },
})

interface CheckJobData {
  monitorId: string
}

interface CheckResult {
  status: 'up' | 'down'
  statusCode: number | null
  latency: number | null
  error: string | null
}

interface RequestHeader {
  key: string
  value: string
}

interface PerformCheckOptions {
  url: string
  method: string
  timeout: number
  expectedStatus: number
  checkSsl: boolean
  followRedirects: boolean
  requestBody: string | null
  requestHeaders: RequestHeader[] | null
}

async function performCheck(options: PerformCheckOptions): Promise<CheckResult> {
  const startTime = Date.now()
  const { url, method, timeout, expectedStatus, followRedirects, requestBody, requestHeaders } = options

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000)

    // Monta headers
    const headers: Record<string, string> = {
      'User-Agent': 'Taco-Monitor/1.0',
    }

    // Adiciona headers customizados
    if (requestHeaders && Array.isArray(requestHeaders)) {
      for (const header of requestHeaders) {
        if (header.key && header.value) {
          headers[header.key] = header.value
        }
      }
    }

    // Se tiver body, adiciona Content-Type se não foi especificado
    if (requestBody && !headers['Content-Type'] && !headers['content-type']) {
      // Tenta detectar se é JSON
      try {
        JSON.parse(requestBody)
        headers['Content-Type'] = 'application/json'
      } catch {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
      }
    }

    const fetchOptions: RequestInit = {
      method,
      signal: controller.signal,
      headers,
      redirect: followRedirects ? 'follow' : 'manual',
    }

    // Adiciona body para métodos que suportam
    if (requestBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = requestBody
    }

    const response = await fetch(url, fetchOptions)

    clearTimeout(timeoutId)

    const latency = Date.now() - startTime
    const statusCode = response.status

    // Se não segue redirects e recebeu um redirect, considera como sucesso se esperado
    const isRedirect = statusCode >= 300 && statusCode < 400
    const isUp = statusCode === expectedStatus || (isRedirect && !followRedirects && expectedStatus === statusCode)

    return {
      status: isUp ? 'up' : 'down',
      statusCode,
      latency,
      error: isUp ? null : `Status code ${statusCode} (esperado: ${expectedStatus})`,
    }
  } catch (err) {
    const latency = Date.now() - startTime
    let errorMsg = 'Erro desconhecido'

    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        errorMsg = `Timeout após ${timeout}s`
      } else {
        errorMsg = err.message
      }
    }

    return {
      status: 'down',
      statusCode: null,
      latency,
      error: errorMsg,
    }
  }
}

async function processMonitorCheck(monitorId: string) {
  // Busca o monitor
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
  })

  if (!monitor) {
    console.log(`Monitor ${monitorId} não encontrado, pulando...`)
    return
  }

  if (!monitor.active) {
    console.log(`Monitor ${monitor.name} está inativo, pulando...`)
    return
  }

  console.log(`🔍 Verificando: ${monitor.name} (${monitor.url})`)

  // Realiza a verificação com as novas configurações
  const result = await performCheck({
    url: monitor.url,
    method: monitor.method,
    timeout: monitor.timeout,
    expectedStatus: monitor.expectedStatus,
    checkSsl: monitor.checkSsl,
    followRedirects: monitor.followRedirects,
    requestBody: monitor.requestBody,
    requestHeaders: monitor.requestHeaders as RequestHeader[] | null,
  })

  // Salva o resultado no banco
  await prisma.check.create({
    data: {
      monitorId: monitor.id,
      status: result.status,
      statusCode: result.statusCode,
      latency: result.latency,
      error: result.error,
    },
  })

  console.log(
    `   ${result.status === 'up' ? '✅' : '❌'} ${monitor.name}: ${result.status} (${result.latency}ms)`
  )

  // Lógica de confirmation period (falhas consecutivas antes de marcar como DOWN)
  const previousStatus = monitor.currentStatus
  let newConsecutiveFails = monitor.consecutiveFails
  let effectiveStatus = result.status

  if (result.status === 'down') {
    newConsecutiveFails++
    // Se não atingiu o confirmation period, mantém o status anterior (se era UP)
    if (monitor.confirmationPeriod > 0 && newConsecutiveFails <= monitor.confirmationPeriod) {
      if (previousStatus === 'up') {
        effectiveStatus = 'up' // Ainda não confirmado como DOWN
        console.log(`   ⏳ Falha ${newConsecutiveFails}/${monitor.confirmationPeriod} - aguardando confirmação`)
      }
    }
  } else {
    // Se está UP, reseta o contador de falhas
    newConsecutiveFails = 0
  }

  // Verifica se precisa disparar alerta (status efetivo mudou)
  const statusChanged = previousStatus !== null && previousStatus !== effectiveStatus
  // Também dispara alerta se é a primeira verificação e status é down
  const isFirstCheckDown = previousStatus === null && effectiveStatus === 'down'

  // Atualiza o status atual do monitor
  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      currentStatus: effectiveStatus,
      lastCheck: new Date(),
      lastLatency: result.latency,
      consecutiveFails: newConsecutiveFails,
    },
  })

  // Verifica se está em janela de manutenção
  const maintenance = await getActiveMaintenanceForMonitor(monitor.id)
  const isInMaintenance = !!maintenance

  if (isInMaintenance) {
    console.log(`   🔧 Monitor em manutenção: ${maintenance?.name}`)
  }

  // Se o status mudou para DOWN, cria um incidente (se não estiver em manutenção ou se não suprimir)
  if ((statusChanged || isFirstCheckDown) && effectiveStatus === 'down') {
    const suppressIncidents = isInMaintenance && (await shouldSuppressIncidents(monitor.id))

    if (suppressIncidents) {
      console.log(`   🔕 Incidente suprimido (manutenção ativa)`)
    } else {
      console.log(`🚨 Criando incidente para ${monitor.name}`)
      try {
        const incident = await createIncident({
          title: monitor.name,
          cause: result.error || 'Monitor indisponivel',
          monitorId: monitor.id,
          teamId: monitor.teamId,
        })

        // Inicia escalonamento se configurado
        if (incident) {
          await startEscalation(incident.id, monitor.id)
        }
      } catch (err) {
        console.error(`   Erro ao criar incidente:`, err)
      }
    }
  }

  // Se o status mudou para UP (recuperou), resolve o incidente automaticamente
  if (statusChanged && effectiveStatus === 'up' && previousStatus === 'down') {
    console.log(`✅ Resolvendo incidente automaticamente para ${monitor.name}`)
    try {
      const resolved = await autoResolveIncident(monitor.id)

      // Para escalonamento se estava ativo
      if (resolved) {
        await stopEscalation(resolved.id)
      }
    } catch (err) {
      console.error(`   Erro ao resolver incidente:`, err)
    }
  }

  // Se o status mudou e alertas estão habilitados, dispara alertas
  if ((statusChanged || isFirstCheckDown) && monitor.alertsEnabled) {
    const suppressAlerts = isInMaintenance && (await shouldSuppressAlerts(monitor.id))

    if (suppressAlerts) {
      console.log(`🔕 Alertas suprimidos (manutenção ativa) para ${monitor.name}`)
    } else {
      console.log(`🔔 Status mudou: ${previousStatus ?? 'unknown'} → ${effectiveStatus} para ${monitor.name}`)
      await triggerAlerts(monitor, previousStatus ?? 'unknown', effectiveStatus, result.error)
    }
  } else if ((statusChanged || isFirstCheckDown) && !monitor.alertsEnabled) {
    console.log(`🔕 Status mudou mas alertas desabilitados para ${monitor.name}`)
  }
}

// Função para disparar alertas quando o status muda
async function triggerAlerts(
  monitor: { id: string; name: string; url: string; teamId: string },
  previousStatus: string,
  newStatus: string,
  errorMessage: string | null
) {
  try {
    // Busca os canais de alerta ativos do time
    const channels = await findActiveChannelsByTeamId(monitor.teamId)

    if (channels.length === 0) {
      console.log(`   Nenhum canal de alerta configurado para o time`)
      return
    }

    // Monta a mensagem do alerta
    const alertMessage = newStatus === 'down'
      ? `Monitor "${monitor.name}" está offline: ${errorMessage || 'Falha na verificação'}`
      : `Monitor "${monitor.name}" voltou a ficar online`

    // Envia notificações para cada canal e registra o alerta
    for (const channel of channels) {
      try {
        // Cria o alerta no banco para este canal
        const alert = await createAlert(
          monitor.id,
          channel.id,
          newStatus as 'up' | 'down' | 'degraded',
          alertMessage
        )
        console.log(`   Alerta criado: ${alert.id}`)

        // Envia a notificação
        await sendNotification(
          channel.type as 'email' | 'webhook' | 'slack',
          channel.config as Record<string, string>,
          {
            monitorName: monitor.name,
            monitorUrl: monitor.url,
            status: newStatus as 'up' | 'down' | 'degraded',
            message: alertMessage,
            checkedAt: new Date(),
          }
        )
        console.log(`   ✅ Notificação enviada via ${channel.type}: ${channel.name}`)
      } catch (err) {
        console.error(`   ❌ Erro ao enviar notificação via ${channel.type}:`, err)
      }
    }
  } catch (err) {
    console.error('Erro ao disparar alertas:', err)
  }
}

// Cria o worker
export const monitorCheckWorker = new Worker<CheckJobData>(
  QUEUE_NAME,
  async (job) => {
    await processMonitorCheck(job.data.monitorId)
  },
  {
    connection: redis,
    concurrency: 10, // Processa até 10 verificações em paralelo
  }
)

monitorCheckWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`)
})

monitorCheckWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message)
})

// Função para agendar verificações de todos os monitores ativos
export async function scheduleAllMonitorChecks() {
  const monitors = await prisma.monitor.findMany({
    where: { active: true },
  })

  console.log(`📋 Agendando verificações para ${monitors.length} monitores...`)

  for (const monitor of monitors) {
    // Agenda verificação recorrente
    await monitorCheckQueue.add(
      `check-${monitor.id}`,
      { monitorId: monitor.id },
      {
        repeat: {
          every: monitor.intervalSeconds * 1000,
        },
        jobId: `repeat-${monitor.id}`,
      }
    )
  }

  console.log('✅ Verificações agendadas!')
}

// Função para adicionar um monitor ao agendamento
export async function scheduleMonitorCheck(monitorId: string) {
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
  })

  if (!monitor || !monitor.active) {
    return
  }

  await monitorCheckQueue.add(
    `check-${monitor.id}`,
    { monitorId: monitor.id },
    {
      repeat: {
        every: monitor.intervalSeconds * 1000,
      },
      jobId: `repeat-${monitor.id}`,
    }
  )
}

// Função para remover um monitor do agendamento
export async function unscheduleMonitorCheck(monitorId: string) {
  const repeatableJobs = await monitorCheckQueue.getRepeatableJobs()
  const job = repeatableJobs.find((j) => j.id === `repeat-${monitorId}`)

  if (job) {
    await monitorCheckQueue.removeRepeatableByKey(job.key)
  }
}
