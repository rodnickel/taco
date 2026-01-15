import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================
// Seed: Planos de Assinatura
// ============================================

const plans = [
  {
    name: 'Free',
    slug: 'free',
    price: 0,
    maxMonitors: 3,
    minIntervalSeconds: 300, // 5 min
    historyDays: 7,
    maxStatusPages: 1,
    maxTeamMembers: 1,
    allowedChannels: ['email'],
  },
  {
    name: 'Starter',
    slug: 'starter',
    price: 2900, // R$29,00
    maxMonitors: 10,
    minIntervalSeconds: 180, // 3 min
    historyDays: 30,
    maxStatusPages: 3,
    maxTeamMembers: 3,
    allowedChannels: ['email', 'telegram', 'webhook'],
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: 7900, // R$79,00
    maxMonitors: 50,
    minIntervalSeconds: 60, // 1 min
    historyDays: 90,
    maxStatusPages: 10,
    maxTeamMembers: 10,
    allowedChannels: ['email', 'telegram', 'webhook', 'whatsapp'],
  },
  {
    name: 'Business',
    slug: 'business',
    price: 19900, // R$199,00
    maxMonitors: -1, // Ilimitado
    minIntervalSeconds: 30, // 30 seg
    historyDays: 365, // 1 ano
    maxStatusPages: -1, // Ilimitado
    maxTeamMembers: -1, // Ilimitado
    allowedChannels: ['email', 'telegram', 'webhook', 'whatsapp'],
  },
]

async function main() {
  console.log('🌱 Iniciando seed dos planos...')

  for (const plan of plans) {
    const existing = await prisma.plan.findUnique({
      where: { slug: plan.slug },
    })

    if (existing) {
      // Atualiza plano existente
      await prisma.plan.update({
        where: { slug: plan.slug },
        data: {
          name: plan.name,
          price: plan.price,
          maxMonitors: plan.maxMonitors,
          minIntervalSeconds: plan.minIntervalSeconds,
          historyDays: plan.historyDays,
          maxStatusPages: plan.maxStatusPages,
          maxTeamMembers: plan.maxTeamMembers,
          allowedChannels: plan.allowedChannels,
        },
      })
      console.log(`  ✅ Plano ${plan.name} atualizado`)
    } else {
      // Cria novo plano
      await prisma.plan.create({
        data: {
          name: plan.name,
          slug: plan.slug,
          price: plan.price,
          maxMonitors: plan.maxMonitors,
          minIntervalSeconds: plan.minIntervalSeconds,
          historyDays: plan.historyDays,
          maxStatusPages: plan.maxStatusPages,
          maxTeamMembers: plan.maxTeamMembers,
          allowedChannels: plan.allowedChannels,
        },
      })
      console.log(`  ✅ Plano ${plan.name} criado`)
    }
  }

  // Atribui plano Free aos times que não têm assinatura
  const teamsWithoutSubscription = await prisma.team.findMany({
    where: { subscription: null },
  })

  if (teamsWithoutSubscription.length > 0) {
    const freePlan = await prisma.plan.findUnique({
      where: { slug: 'free' },
    })

    if (freePlan) {
      for (const team of teamsWithoutSubscription) {
        await prisma.subscription.create({
          data: {
            teamId: team.id,
            planId: freePlan.id,
            status: 'ACTIVE',
          },
        })
        console.log(`  ✅ Plano Free atribuído ao time "${team.name}"`)
      }
    }
  }

  console.log('🌱 Seed concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
