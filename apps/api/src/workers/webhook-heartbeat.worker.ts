import { Queue, Worker } from 'bullmq'
import { redis } from '../lib/redis.js'
import { checkWebhookHeartbeats } from '../modules/webhooks/webhooks.service.js'

// ============================================
// Worker para verificar heartbeats de monitores webhook
// ============================================

const HEARTBEAT_CHECK_QUEUE = 'webhook-heartbeat-check'

// Cria a fila
export const webhookHeartbeatQueue = new Queue(HEARTBEAT_CHECK_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
})

// Cria o worker
export const webhookHeartbeatWorker = new Worker(
  HEARTBEAT_CHECK_QUEUE,
  async () => {
    console.log('[Webhook Heartbeat] Verificando heartbeats expirados...')
    await checkWebhookHeartbeats()
  },
  {
    connection: redis,
    concurrency: 1, // Apenas 1 job por vez
  }
)

// Event listeners
webhookHeartbeatWorker.on('completed', (job) => {
  console.log(`[Webhook Heartbeat] Job ${job.id} concluído`)
})

webhookHeartbeatWorker.on('failed', (job, err) => {
  console.error(`[Webhook Heartbeat] Job ${job?.id} falhou:`, err.message)
})

// ============================================
// Agenda verificação periódica de heartbeats
// ============================================

export async function startWebhookHeartbeatChecker() {
  // Limpa jobs antigos antes de agendar novos
  await webhookHeartbeatQueue.obliterate({ force: true })

  // Agenda verificação a cada 60 segundos
  await webhookHeartbeatQueue.add(
    'check-heartbeats',
    {},
    {
      repeat: {
        every: 60000, // 60 segundos
      },
      jobId: 'webhook-heartbeat-checker',
    }
  )

  console.log('✅ Verificador de heartbeat webhook agendado (a cada 60s)')
}
