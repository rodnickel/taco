import { Worker, Queue } from 'bullmq'
import { redis } from '../lib/redis.js'
import { processEscalations } from '../services/escalation.service.js'

// ============================================
// Worker de Escalonamento de Alertas
// ============================================

const QUEUE_NAME = 'escalation-processor'
const PROCESS_INTERVAL = 30 * 1000 // 30 segundos

// Fila para processar escalonamentos
export const escalationQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 10,
  },
})

interface EscalationJobData {
  type: 'process'
}

// Worker que processa escalonamentos
export const escalationWorker = new Worker<EscalationJobData>(
  QUEUE_NAME,
  async (job) => {
    if (job.data.type === 'process') {
      const count = await processEscalations()
      if (count > 0) {
        console.log(`🔔 Processados ${count} escalonamentos pendentes`)
      }
    }
  },
  {
    connection: redis,
    concurrency: 1, // Processa um de cada vez
  }
)

escalationWorker.on('completed', (job) => {
  // Log silencioso para não poluir muito
})

escalationWorker.on('failed', (job, err) => {
  console.error(`Job de escalonamento ${job?.id} falhou:`, err.message)
})

// Função para iniciar o processamento recorrente
export async function startEscalationProcessor() {
  // Remove jobs antigos
  const repeatableJobs = await escalationQueue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    await escalationQueue.removeRepeatableByKey(job.key)
  }

  // Agenda processamento recorrente
  await escalationQueue.add(
    'process-escalations',
    { type: 'process' },
    {
      repeat: {
        every: PROCESS_INTERVAL,
      },
      jobId: 'escalation-processor',
    }
  )

  console.log(`⏰ Processador de escalonamento iniciado (intervalo: ${PROCESS_INTERVAL / 1000}s)`)
}
