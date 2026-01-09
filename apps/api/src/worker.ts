import 'dotenv/config'
import { redis } from './lib/redis.js'
import { prisma } from './lib/prisma.js'
import {
  monitorCheckWorker,
  scheduleAllMonitorChecks,
} from './workers/monitor-check.worker.js'
import {
  escalationWorker,
  startEscalationProcessor,
} from './workers/escalation.worker.js'
import {
  sslCheckWorker,
  startSSLCheckProcessor,
} from './workers/ssl-check.worker.js'

// ============================================
// Script para executar o Worker de forma independente
// ============================================

async function start() {
  console.log('🚀 Iniciando Monitor Check Worker...')

  try {
    // Testa conexão com o banco
    await prisma.$connect()
    console.log('✅ Conectado ao PostgreSQL')

    // Aguarda conexão do Redis
    await new Promise<void>((resolve) => {
      if (redis.status === 'ready') {
        resolve()
      } else {
        redis.once('ready', resolve)
      }
    })

    // Agenda verificações de todos os monitores ativos
    await scheduleAllMonitorChecks()

    // Inicia processador de escalonamento
    await startEscalationProcessor()

    // Inicia verificador de SSL
    await startSSLCheckProcessor()

    console.log('✅ Workers rodando e aguardando jobs...')
  } catch (err) {
    console.error('❌ Erro ao iniciar worker:', err)
    process.exit(1)
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('\n🔄 Encerrando workers...')

  await monitorCheckWorker.close()
  await escalationWorker.close()
  await sslCheckWorker.close()
  await prisma.$disconnect()
  await redis.quit()

  console.log('✅ Workers encerrados com sucesso')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start()
