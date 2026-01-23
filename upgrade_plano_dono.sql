-- ============================================
-- UPGRADE DE PLANO (SEM PAGAMENTO) - DONO DO NEGÓCIO
-- Data: 2026-01-22
-- Descrição: Atualiza plano do owner para Business/Pro sem passar por pagamento
-- ============================================

-- 1. Ver todos os planos disponíveis
SELECT
  '=== PLANOS DISPONÍVEIS ===' as info;

SELECT
  id,
  name,
  slug,
  price / 100.0 as price_reais,
  max_monitors,
  min_interval_seconds / 60.0 as min_interval_minutes,
  max_status_pages,
  max_team_members,
  allowed_channels
FROM plans
ORDER BY price;

-- 2. Ver sua assinatura atual
SELECT
  '=== SUA ASSINATURA ATUAL ===' as info;

SELECT
  s.id as subscription_id,
  t.name as team_name,
  t.slug as team_slug,
  u.email as owner_email,
  p.name as current_plan,
  p.slug as current_plan_slug,
  p.price / 100.0 as current_price_reais,
  s.status,
  s.current_period_start,
  s.current_period_end
FROM subscriptions s
JOIN teams t ON t.id = s.team_id
JOIN plans p ON p.id = s.plan_id
JOIN users u ON u.id = t.owner_id
WHERE u.email = (
  -- Pega o primeiro admin/owner do sistema
  SELECT u2.email
  FROM users u2
  JOIN team_members tm ON tm.user_id = u2.id
  WHERE tm.role = 'ADMIN'
  LIMIT 1
);

-- ============================================
-- FAZER UPGRADE
-- ============================================

-- OPÇÃO 1: Upgrade para BUSINESS (Recomendado para o dono)
-- Descomente as linhas abaixo para executar:

/*
BEGIN;

-- Atualizar subscription para o plano Business
UPDATE subscriptions
SET
  plan_id = (SELECT id FROM plans WHERE slug = 'business'),
  status = 'ACTIVE',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 year', -- 1 ano grátis
  cancel_at_period_end = false,
  updated_at = NOW()
WHERE team_id = (
  SELECT t.id
  FROM teams t
  JOIN users u ON u.id = t.owner_id
  ORDER BY t.created_at ASC
  LIMIT 1
);

COMMIT;

SELECT '✅ UPGRADE PARA BUSINESS REALIZADO!' as status;
*/

-- OPÇÃO 2: Upgrade para PRO
-- Descomente as linhas abaixo para executar:

/*
BEGIN;

UPDATE subscriptions
SET
  plan_id = (SELECT id FROM plans WHERE slug = 'pro'),
  status = 'ACTIVE',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 year',
  cancel_at_period_end = false,
  updated_at = NOW()
WHERE team_id = (
  SELECT t.id
  FROM teams t
  JOIN users u ON u.id = t.owner_id
  ORDER BY t.created_at ASC
  LIMIT 1
);

COMMIT;

SELECT '✅ UPGRADE PARA PRO REALIZADO!' as status;
*/

-- ============================================
-- VERIFICAR UPGRADE
-- ============================================

-- Executar DEPOIS do upgrade para confirmar
SELECT
  '=== VERIFICAÇÃO PÓS-UPGRADE ===' as info;

SELECT
  t.name as team_name,
  u.email as owner_email,
  p.name as new_plan,
  p.slug as new_plan_slug,
  p.price / 100.0 as price_reais,
  p.max_monitors,
  p.min_interval_seconds / 60.0 as min_interval_minutes,
  p.max_status_pages,
  p.max_team_members,
  s.status,
  s.current_period_end
FROM subscriptions s
JOIN teams t ON t.id = s.team_id
JOIN plans p ON p.id = s.plan_id
JOIN users u ON u.id = t.owner_id
WHERE u.email = (
  SELECT u2.email
  FROM users u2
  JOIN team_members tm ON tm.user_id = u2.id
  WHERE tm.role = 'ADMIN'
  LIMIT 1
);

-- ============================================
-- UPGRADE ESPECÍFICO POR EMAIL
-- ============================================

-- Se você quiser fazer upgrade de um usuário específico:

/*
BEGIN;

UPDATE subscriptions
SET
  plan_id = (SELECT id FROM plans WHERE slug = 'business'),
  status = 'ACTIVE',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 year',
  cancel_at_period_end = false,
  updated_at = NOW()
WHERE team_id = (
  SELECT t.id
  FROM teams t
  JOIN users u ON u.id = t.owner_id
  WHERE u.email = 'SEU-EMAIL@AQUI.COM'  -- ← TROCAR PELO SEU EMAIL
  LIMIT 1
);

COMMIT;

SELECT '✅ UPGRADE REALIZADO PARA O EMAIL ESPECIFICADO!' as status;
*/

-- ============================================
-- NOTAS:
--
-- 1. Execute primeiro as queries de SELECT para ver seu plano atual
-- 2. Escolha qual upgrade deseja (Business ou Pro)
-- 3. Descomente o bloco BEGIN/COMMIT correspondente
-- 4. Execute novamente a query de verificação
-- 5. Faça logout e login novamente no dashboard
-- 6. O plano deve aparecer atualizado na página /pricing
--
-- LIMITES DOS PLANOS:
--
-- FREE:
--   - 3 monitores
--   - 5 min intervalo
--   - 1 status page
--   - 1 membro
--   - Canal: Email
--
-- STARTER:
--   - 10 monitores
--   - 1 min intervalo
--   - 2 status pages
--   - 1 membro
--   - Canais: Email, Telegram, Webhook
--
-- PRO:
--   - 50 monitores
--   - 30s intervalo
--   - 5 status pages
--   - 3 membros
--   - Canais: Email, Telegram, Webhook, WhatsApp
--
-- BUSINESS:
--   - 200 monitores
--   - 30s intervalo
--   - Ilimitado status pages
--   - 10 membros
--   - Todos os canais
-- ============================================
