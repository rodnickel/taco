import { prisma } from '../../lib/prisma.js'

// ============================================
// Serviço de Planos
// ============================================

/**
 * Retorna todos os planos ativos
 */
export async function getAllPlans() {
  return prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { price: 'asc' },
  })
}

/**
 * Retorna um plano pelo slug
 */
export async function getPlanBySlug(slug: string) {
  return prisma.plan.findUnique({
    where: { slug },
  })
}

/**
 * Retorna o plano atual de um time
 */
export async function getTeamPlan(teamId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { teamId },
    include: { plan: true },
  })

  // Se não tem assinatura, retorna plano Free por padrão
  if (!subscription) {
    return prisma.plan.findUnique({
      where: { slug: 'free' },
    })
  }

  return subscription.plan
}

/**
 * Retorna a assinatura de um time com detalhes do plano
 */
export async function getTeamSubscription(teamId: string) {
  return prisma.subscription.findUnique({
    where: { teamId },
    include: { plan: true },
  })
}

/**
 * Retorna o uso atual de recursos do time
 */
export async function getTeamUsage(teamId: string) {
  const [monitorsCount, statusPagesCount, membersCount] = await Promise.all([
    prisma.monitor.count({ where: { teamId } }),
    prisma.statusPage.count({ where: { teamId } }),
    prisma.teamMember.count({ where: { teamId } }),
  ])

  return {
    monitors: monitorsCount,
    statusPages: statusPagesCount,
    members: membersCount,
  }
}

/**
 * Retorna uso e limites do time
 */
export async function getTeamUsageWithLimits(teamId: string) {
  const [plan, usage] = await Promise.all([
    getTeamPlan(teamId),
    getTeamUsage(teamId),
  ])

  if (!plan) {
    throw new Error('Plano não encontrado')
  }

  return {
    plan: {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
    },
    usage: {
      monitors: {
        current: usage.monitors,
        limit: plan.maxMonitors,
        unlimited: plan.maxMonitors === -1,
      },
      statusPages: {
        current: usage.statusPages,
        limit: plan.maxStatusPages,
        unlimited: plan.maxStatusPages === -1,
      },
      members: {
        current: usage.members,
        limit: plan.maxTeamMembers,
        unlimited: plan.maxTeamMembers === -1,
      },
    },
    limits: {
      minIntervalSeconds: plan.minIntervalSeconds,
      historyDays: plan.historyDays,
      allowedChannels: plan.allowedChannels as string[],
    },
  }
}
