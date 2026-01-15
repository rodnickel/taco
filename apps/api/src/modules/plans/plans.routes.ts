import type { FastifyInstance } from 'fastify'
import * as plansService from './plans.service.js'

// ============================================
// Rotas de Planos
// ============================================

export async function plansRoutes(app: FastifyInstance) {
  // GET /plans - Lista todos os planos disponíveis (público)
  app.get('/', async () => {
    const plans = await plansService.getAllPlans()

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      price: plan.price,
      priceFormatted: `R$ ${(plan.price / 100).toFixed(2).replace('.', ',')}`,
      limits: {
        monitors: plan.maxMonitors === -1 ? 'Ilimitado' : plan.maxMonitors,
        statusPages: plan.maxStatusPages === -1 ? 'Ilimitado' : plan.maxStatusPages,
        teamMembers: plan.maxTeamMembers === -1 ? 'Ilimitado' : plan.maxTeamMembers,
        minIntervalSeconds: plan.minIntervalSeconds,
        minIntervalFormatted: formatInterval(plan.minIntervalSeconds),
        historyDays: plan.historyDays,
        historyFormatted: formatHistory(plan.historyDays),
        allowedChannels: plan.allowedChannels,
      },
    }))
  })

  // GET /plans/:slug - Retorna detalhes de um plano específico
  app.get<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    const { slug } = request.params
    const plan = await plansService.getPlanBySlug(slug)

    if (!plan) {
      return reply.status(404).send({ error: 'Plano não encontrado' })
    }

    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      price: plan.price,
      priceFormatted: `R$ ${(plan.price / 100).toFixed(2).replace('.', ',')}`,
      limits: {
        monitors: plan.maxMonitors,
        statusPages: plan.maxStatusPages,
        teamMembers: plan.maxTeamMembers,
        minIntervalSeconds: plan.minIntervalSeconds,
        historyDays: plan.historyDays,
        allowedChannels: plan.allowedChannels,
      },
    }
  })
}

// ============================================
// Rotas de Assinatura do Time (autenticadas)
// ============================================

export async function subscriptionRoutes(app: FastifyInstance) {
  // Todas as rotas requerem autenticação
  app.addHook('onRequest', async (request) => {
    await request.jwtVerify()
  })

  // GET /teams/:teamId/subscription - Retorna assinatura do time
  app.get<{ Params: { teamId: string } }>('/:teamId/subscription', async (request, reply) => {
    const { teamId } = request.params

    // Verifica se o usuário tem acesso ao time
    const hasAccess = await request.verifyTeamAccess(teamId)
    if (!hasAccess) {
      return reply.status(403).send({ error: 'Sem permissão para acessar este time' })
    }

    const subscription = await plansService.getTeamSubscription(teamId)

    if (!subscription) {
      // Retorna plano Free se não tem assinatura
      const freePlan = await plansService.getPlanBySlug('free')
      return {
        plan: freePlan,
        status: 'active',
        currentPeriodStart: null,
        currentPeriodEnd: null,
      }
    }

    return {
      id: subscription.id,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        slug: subscription.plan.slug,
        price: subscription.plan.price,
      },
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    }
  })

  // GET /teams/:teamId/usage - Retorna uso atual vs limites
  app.get<{ Params: { teamId: string } }>('/:teamId/usage', async (request, reply) => {
    const { teamId } = request.params

    // Verifica se o usuário tem acesso ao time
    const hasAccess = await request.verifyTeamAccess(teamId)
    if (!hasAccess) {
      return reply.status(403).send({ error: 'Sem permissão para acessar este time' })
    }

    const usageWithLimits = await plansService.getTeamUsageWithLimits(teamId)
    return usageWithLimits
  })
}

// ============================================
// Helpers
// ============================================

function formatInterval(seconds: number): string {
  if (seconds >= 60) {
    const minutes = seconds / 60
    return `${minutes} min`
  }
  return `${seconds} seg`
}

function formatHistory(days: number): string {
  if (days >= 365) {
    const years = days / 365
    return `${years} ano${years > 1 ? 's' : ''}`
  }
  return `${days} dias`
}
