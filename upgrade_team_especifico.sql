-- ============================================
-- UPGRADE PARA BUSINESS - TIME ESPECÍFICO
-- Team ID: cmk5jnvl90002s201sdpmvv8p
-- Data: 2026-01-22
-- ============================================

-- 1. Ver informações do time ANTES do upgrade
SELECT
  '=== INFORMAÇÕES DO TIME (ANTES) ===' as info;

SELECT
  t.id as team_id,
  t.name as team_name,
  t.slug as team_slug,
  u.email as owner_email,
  p.name as current_plan,
  p.slug as current_plan_slug,
  p.max_monitors,
  p.max_status_pages,
  p.max_team_members,
  s.status as subscription_status,
  s.current_period_end
FROM teams t
JOIN users u ON u.id = t.owner_id
JOIN subscriptions s ON s.team_id = t.id
JOIN plans p ON p.id = s.plan_id
WHERE t.id = 'cmk5jnvl90002s201sdpmvv8p';

-- ============================================
-- FAZER UPGRADE PARA BUSINESS
-- ============================================

BEGIN;

UPDATE subscriptions
SET
  plan_id = (SELECT id FROM plans WHERE slug = 'business'),
  status = 'ACTIVE',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 year', -- 1 ano grátis
  cancel_at_period_end = false,
  updated_at = NOW()
WHERE team_id = 'cmk5jnvl90002s201sdpmvv8p';

COMMIT;

SELECT '✅ UPGRADE PARA BUSINESS CONCLUÍDO!' as status;

-- ============================================
-- VERIFICAR UPGRADE (DEPOIS)
-- ============================================

SELECT
  '=== INFORMAÇÕES DO TIME (DEPOIS) ===' as info;

SELECT
  t.id as team_id,
  t.name as team_name,
  t.slug as team_slug,
  u.email as owner_email,
  p.name as NEW_PLAN,
  p.slug as new_plan_slug,
  p.max_monitors as max_monitors,
  p.max_status_pages as max_status_pages,
  p.max_team_members as max_team_members,
  p.allowed_channels,
  s.status as subscription_status,
  s.current_period_end as valid_until
FROM teams t
JOIN users u ON u.id = t.owner_id
JOIN subscriptions s ON s.team_id = t.id
JOIN plans p ON p.id = s.plan_id
WHERE t.id = 'cmk5jnvl90002s201sdpmvv8p';

-- Resultado esperado:
-- NEW_PLAN: Business
-- max_monitors: 200
-- max_status_pages: -1 (ilimitado)
-- max_team_members: 10
-- valid_until: 2027-01-22 (1 ano)

-- ============================================
-- PRÓXIMOS PASSOS:
--
-- 1. Faça logout do dashboard
-- 2. Faça login novamente
-- 3. Vá em /pricing - deve mostrar "Plano Atual" no Business
-- 4. Dashboard deve mostrar novos limites
-- 5. Pode criar até 200 monitores agora!
-- ============================================
