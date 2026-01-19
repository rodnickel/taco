import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { registerAuthDecorator } from './lib/auth.js'
import { registerTeamAuthDecorator } from './lib/team-auth.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { monitorsRoutes } from './modules/monitors/monitors.routes.js'
import { alertsRoutes } from './modules/alerts/alerts.routes.js'
import { escalationRoutes } from './modules/alerts/escalation.routes.js'
import { statusPagesRoutes, publicStatusPageRoutes } from './modules/status-pages/status-pages.routes.js'
import { teamsRoutes, invitesRoutes } from './modules/teams/teams.routes.js'
import { incidentsRoutes } from './modules/incidents/incidents.routes.js'
import { groupsRoutes } from './modules/groups/groups.routes.js'
import { maintenanceRoutes } from './modules/maintenance/maintenance.routes.js'
import { plansRoutes, subscriptionRoutes } from './modules/plans/plans.routes.js'

// Cria a instância do Fastify com logger habilitado
const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    transport:
      env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
            },
          }
        : undefined,
  },
})

// Hook para logar todas as requisições
app.addHook('onRequest', async (request) => {
  console.log(`📥 ${request.method} ${request.url}`)
})

// Hook para logar respostas
app.addHook('onResponse', async (request, reply) => {
  console.log(`📤 ${request.method} ${request.url} -> ${reply.statusCode}`)
})

// Hook para logar erros
app.addHook('onError', async (request, reply, error) => {
  console.log(`❌ ERROR ${request.method} ${request.url}:`, error.message)
})

// Registra plugins
async function registerPlugins() {
  // CORS - permite requisições do frontend
  await app.register(cors, {
    origin: true, // Aceita qualquer origem em desenvolvimento
    credentials: true,
  })

  // Valida que JWT_SECRET existe e tem tamanho adequado (obrigatório para a API)
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required for API server')
  }
  if (env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long')
  }

  // JWT - autenticação
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  })

  // Registra o decorator de autenticação
  await registerAuthDecorator(app)

  // Registra o decorator de autorização de times
  await registerTeamAuthDecorator(app)
}

// Registra as rotas
async function registerRoutes() {
  // Rotas de autenticação: /auth/*
  await app.register(authRoutes, { prefix: '/auth' })

  // Rotas de monitors: /monitors/*
  await app.register(monitorsRoutes, { prefix: '/monitors' })

  // Rotas de alerts: /alerts/*
  await app.register(alertsRoutes, { prefix: '/alerts' })

  // Rotas de políticas de escalonamento
  await app.register(escalationRoutes)

  // Rotas de status pages (autenticadas): /status-pages/*
  await app.register(statusPagesRoutes, { prefix: '/status-pages' })

  // Rotas públicas de status pages: /public/status/*
  await app.register(publicStatusPageRoutes, { prefix: '/public/status' })

  // Rotas de times: /teams/*
  await app.register(teamsRoutes, { prefix: '/teams' })

  // Rotas públicas de convites: /invites/*
  await app.register(invitesRoutes, { prefix: '/invites' })

  // Rotas de incidentes: /incidents/*
  await app.register(incidentsRoutes, { prefix: '/incidents' })

  // Rotas de grupos: /groups/*
  await app.register(groupsRoutes, { prefix: '/groups' })

  // Rotas de manutenção: /maintenance/*
  await app.register(maintenanceRoutes, { prefix: '/maintenance' })

  // Rotas de planos (públicas): /plans/*
  await app.register(plansRoutes, { prefix: '/plans' })

  // Rotas de assinatura do time: /teams/:teamId/subscription e /teams/:teamId/usage
  await app.register(subscriptionRoutes, { prefix: '/teams' })
}

// Rota de health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Rota raiz
app.get('/', async () => {
  return {
    name: 'BeaconOps API',
    version: '0.1.0',
    docs: '/docs',
  }
})

// Função para iniciar o servidor
async function start() {
  try {
    // Registra plugins
    await registerPlugins()

    // Registra rotas
    await registerRoutes()

    // Testa conexão com o banco de dados
    await prisma.$connect()
    console.log('✅ Conectado ao PostgreSQL')

    // Inicia o servidor
    await app.listen({
      port: env.API_PORT,
      host: '0.0.0.0',
    })

    console.log(`🚀 Servidor rodando em ${env.API_URL}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('\n🔄 Encerrando servidor...')

  await app.close()
  await prisma.$disconnect()

  console.log('✅ Servidor encerrado com sucesso')
  process.exit(0)
}

// Captura sinais de encerramento
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// Inicia a aplicação
start()
