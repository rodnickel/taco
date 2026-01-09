import { Worker, Queue } from 'bullmq'
import { redis } from '../lib/redis.js'
import { checkAllSSLCertificates } from '../services/ssl-check.service.js'

// ============================================
// Worker de Verificação de Certificados SSL
// ============================================

const QUEUE_NAME = 'ssl-checks'

// Intervalo padrão: a cada 12 horas
const CHECK_INTERVAL = 12 * 60 * 60 * 1000

// Dias de antecedência para alertar sobre expiração
const ALERT_DAYS_BEFORE = 30

// Fila para verificações SSL
export const sslCheckQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 10,
  },
})

interface SSLCheckJobData {
  type: 'check-all'
  alertDays?: number
}

// Worker que processa verificações SSL
export const sslCheckWorker = new Worker<SSLCheckJobData>(
  QUEUE_NAME,
  async (job) => {
    if (job.data.type === 'check-all') {
      const alertDays = job.data.alertDays || ALERT_DAYS_BEFORE
      await checkAllSSLCertificates(alertDays)
    }
  },
  {
    connection: redis,
    concurrency: 1, // Processa um de cada vez
  }
)

sslCheckWorker.on('completed', (job) => {
  console.log(`Job SSL ${job.id} completed`)
})

sslCheckWorker.on('failed', (job, err) => {
  console.error(`Job SSL ${job?.id} failed:`, err.message)
})

// Função para iniciar verificações SSL recorrentes
export async function startSSLCheckProcessor() {
  // Remove jobs antigos
  const repeatableJobs = await sslCheckQueue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    await sslCheckQueue.removeRepeatableByKey(job.key)
  }

  // Agenda verificação recorrente
  await sslCheckQueue.add(
    'ssl-check-all',
    { type: 'check-all', alertDays: ALERT_DAYS_BEFORE },
    {
      repeat: {
        every: CHECK_INTERVAL,
      },
      jobId: 'ssl-check-all',
    }
  )

  // Executa uma verificação imediata na inicialização
  await sslCheckQueue.add(
    'ssl-check-initial',
    { type: 'check-all', alertDays: ALERT_DAYS_BEFORE },
    {
      delay: 60000, // Aguarda 1 minuto após inicialização
    }
  )

  console.log(`🔐 Verificador SSL iniciado (intervalo: ${CHECK_INTERVAL / (60 * 60 * 1000)}h, alerta: ${ALERT_DAYS_BEFORE} dias)`)
}

// Função para forçar verificação SSL manualmente
export async function triggerSSLCheck(alertDays: number = ALERT_DAYS_BEFORE) {
  await sslCheckQueue.add(
    'ssl-check-manual',
    { type: 'check-all', alertDays },
    { priority: 1 }
  )
}
