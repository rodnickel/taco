import { getTeamPlan, getTeamUsage } from './plans.service.js'

// ============================================
// Serviço de Verificação de Limites
// ============================================

export interface LimitCheckResult {
  allowed: boolean
  current: number
  limit: number
  unlimited: boolean
  message?: string
}

/**
 * Verifica se o time pode criar mais monitores
 */
export async function checkMonitorLimit(teamId: string): Promise<LimitCheckResult> {
  const [plan, usage] = await Promise.all([
    getTeamPlan(teamId),
    getTeamUsage(teamId),
  ])

  if (!plan) {
    return {
      allowed: false,
      current: usage.monitors,
      limit: 0,
      unlimited: false,
      message: 'Plano não encontrado',
    }
  }

  const unlimited = plan.maxMonitors === -1
  const allowed = unlimited || usage.monitors < plan.maxMonitors

  return {
    allowed,
    current: usage.monitors,
    limit: plan.maxMonitors,
    unlimited,
    message: allowed ? undefined : `Limite de ${plan.maxMonitors} monitores atingido. Faça upgrade para criar mais.`,
  }
}

/**
 * Verifica se o time pode criar mais status pages
 */
export async function checkStatusPageLimit(teamId: string): Promise<LimitCheckResult> {
  const [plan, usage] = await Promise.all([
    getTeamPlan(teamId),
    getTeamUsage(teamId),
  ])

  if (!plan) {
    return {
      allowed: false,
      current: usage.statusPages,
      limit: 0,
      unlimited: false,
      message: 'Plano não encontrado',
    }
  }

  const unlimited = plan.maxStatusPages === -1
  const allowed = unlimited || usage.statusPages < plan.maxStatusPages

  return {
    allowed,
    current: usage.statusPages,
    limit: plan.maxStatusPages,
    unlimited,
    message: allowed ? undefined : `Limite de ${plan.maxStatusPages} status pages atingido. Faça upgrade para criar mais.`,
  }
}

/**
 * Verifica se o time pode adicionar mais membros
 */
export async function checkTeamMemberLimit(teamId: string): Promise<LimitCheckResult> {
  const [plan, usage] = await Promise.all([
    getTeamPlan(teamId),
    getTeamUsage(teamId),
  ])

  if (!plan) {
    return {
      allowed: false,
      current: usage.members,
      limit: 0,
      unlimited: false,
      message: 'Plano não encontrado',
    }
  }

  const unlimited = plan.maxTeamMembers === -1
  const allowed = unlimited || usage.members < plan.maxTeamMembers

  return {
    allowed,
    current: usage.members,
    limit: plan.maxTeamMembers,
    unlimited,
    message: allowed ? undefined : `Limite de ${plan.maxTeamMembers} membros atingido. Faça upgrade para adicionar mais.`,
  }
}

/**
 * Retorna o intervalo mínimo permitido para o time (em segundos)
 */
export async function getMinInterval(teamId: string): Promise<number> {
  const plan = await getTeamPlan(teamId)
  return plan?.minIntervalSeconds ?? 300 // 5 min default
}

/**
 * Verifica se um intervalo é válido para o plano do time
 */
export async function checkIntervalAllowed(teamId: string, intervalSeconds: number): Promise<{
  allowed: boolean
  minInterval: number
  message?: string
}> {
  const minInterval = await getMinInterval(teamId)
  const allowed = intervalSeconds >= minInterval

  return {
    allowed,
    minInterval,
    message: allowed ? undefined : `Intervalo mínimo para seu plano é ${minInterval} segundos. Faça upgrade para intervalos menores.`,
  }
}

/**
 * Retorna os canais de alerta permitidos para o time
 */
export async function getAllowedChannels(teamId: string): Promise<string[]> {
  const plan = await getTeamPlan(teamId)
  return (plan?.allowedChannels as string[]) ?? ['email']
}

/**
 * Verifica se um canal de alerta é permitido para o time
 */
export async function checkChannelAllowed(teamId: string, channelType: string): Promise<{
  allowed: boolean
  allowedChannels: string[]
  message?: string
}> {
  const allowedChannels = await getAllowedChannels(teamId)
  const allowed = allowedChannels.includes(channelType)

  return {
    allowed,
    allowedChannels,
    message: allowed ? undefined : `Canal "${channelType}" não disponível no seu plano. Faça upgrade para usar este canal.`,
  }
}

/**
 * Retorna os dias de histórico permitidos para o time
 */
export async function getHistoryDays(teamId: string): Promise<number> {
  const plan = await getTeamPlan(teamId)
  return plan?.historyDays ?? 7
}
