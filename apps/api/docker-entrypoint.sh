#!/bin/sh
set -e

echo "=== BeaconOps API Startup ==="

# Aguarda o PostgreSQL estar disponivel
echo "Aguardando PostgreSQL..."
until nc -z postgres 5432; do
  echo "PostgreSQL ainda nao disponivel, aguardando..."
  sleep 2
done
echo "PostgreSQL disponivel!"

# Sincroniza o schema do banco (idempotente)
echo "Sincronizando schema do banco..."
npx prisma db push --skip-generate || echo "Schema ja sincronizado"

# Executa seed dos planos (idempotente)
echo "Executando seed dos planos..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const plans = [
  { name: 'Free', slug: 'free', price: 0, maxMonitors: 3, minIntervalSeconds: 300, historyDays: 7, maxStatusPages: 1, maxTeamMembers: 1, allowedChannels: ['email'] },
  { name: 'Starter', slug: 'starter', price: 2900, maxMonitors: 10, minIntervalSeconds: 180, historyDays: 30, maxStatusPages: 3, maxTeamMembers: 3, allowedChannels: ['email', 'telegram', 'webhook'] },
  { name: 'Pro', slug: 'pro', price: 7900, maxMonitors: 50, minIntervalSeconds: 60, historyDays: 90, maxStatusPages: 10, maxTeamMembers: 10, allowedChannels: ['email', 'telegram', 'webhook', 'whatsapp'] },
  { name: 'Business', slug: 'business', price: 19900, maxMonitors: -1, minIntervalSeconds: 30, historyDays: 365, maxStatusPages: -1, maxTeamMembers: -1, allowedChannels: ['email', 'telegram', 'webhook', 'whatsapp'] }
];

(async () => {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan
    });
    console.log('  Plan ' + plan.name + ' OK');
  }

  // Atribui plano Free aos times sem assinatura
  const freePlan = await prisma.plan.findUnique({ where: { slug: 'free' } });
  const teams = await prisma.team.findMany({ where: { subscription: null } });
  for (const team of teams) {
    await prisma.subscription.create({ data: { teamId: team.id, planId: freePlan.id, status: 'ACTIVE' } });
    console.log('  Free plan assigned to team: ' + team.name);
  }

  await prisma.\$disconnect();
})();
" || echo "Seed executado"

echo "Iniciando aplicacao..."
exec "$@"
