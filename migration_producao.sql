-- ============================================
-- MIGRATION PARA PRODUÇÃO: add_webhook_monitor_type
-- Data: 2026-01-22
-- Descrição: Adiciona suporte a monitores tipo Webhook
--
-- ANTES DE EXECUTAR:
-- 1. Faça backup do banco!
-- 2. Verifique que está conectado no banco correto (database: taco)
-- ============================================

-- Exibir informações do banco
SELECT current_database() as database, current_user as user, version();

-- Verificar estado ANTES
SELECT
  'Estado ANTES da migration:' as status,
  COUNT(*) as total_monitors
FROM monitors;

-- ============================================
-- APLICAR MIGRATION
-- ============================================

BEGIN;

-- Adicionar coluna 'type' (http ou webhook)
ALTER TABLE "monitors" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'http';

-- Adicionar colunas específicas para webhook
ALTER TABLE "monitors" ADD COLUMN IF NOT EXISTS "webhook_token" TEXT;
ALTER TABLE "monitors" ADD COLUMN IF NOT EXISTS "webhook_secret" TEXT;
ALTER TABLE "monitors" ADD COLUMN IF NOT EXISTS "heartbeat_interval" INTEGER DEFAULT 300;
ALTER TABLE "monitors" ADD COLUMN IF NOT EXISTS "last_heartbeat" TIMESTAMP(3);

-- Criar índice único para webhook_token
CREATE UNIQUE INDEX IF NOT EXISTS "monitors_webhook_token_key" ON "monitors"("webhook_token");

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS "monitors_type_idx" ON "monitors"("type");
CREATE INDEX IF NOT EXISTS "monitors_webhook_token_idx" ON "monitors"("webhook_token");

-- Garantir que todos os monitores existentes são do tipo 'http'
UPDATE "monitors" SET "type" = 'http' WHERE "type" IS NULL OR "type" = '';

COMMIT;

-- ============================================
-- VERIFICAR MIGRATION APLICADA
-- ============================================

-- Verificar novas colunas
SELECT
  'VERIFICAÇÃO: Novas colunas criadas' as status;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'monitors'
  AND column_name IN ('type', 'webhook_token', 'webhook_secret', 'heartbeat_interval', 'last_heartbeat')
ORDER BY column_name;

-- Verificar índices
SELECT
  'VERIFICAÇÃO: Índices criados' as status;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'monitors'
  AND (indexname LIKE '%webhook%' OR indexname LIKE '%type%')
ORDER BY indexname;

-- Verificar distribuição por tipo
SELECT
  'VERIFICAÇÃO: Distribuição de monitores por tipo' as status;

SELECT type, COUNT(*) as quantidade
FROM monitors
GROUP BY type;

-- Resultado final
SELECT
  '✅ MIGRATION APLICADA COM SUCESSO!' as status,
  COUNT(*) as total_monitors,
  COUNT(CASE WHEN type = 'http' THEN 1 END) as monitors_http,
  COUNT(CASE WHEN type = 'webhook' THEN 1 END) as monitors_webhook
FROM monitors;

-- ============================================
-- PRÓXIMOS PASSOS:
--
-- 1. Se viu "✅ MIGRATION APLICADA COM SUCESSO!", está tudo certo!
-- 2. Reinicie os containers (worker principalmente)
-- 3. Verifique os logs: docker logs -f <worker-container>
-- 4. Deve aparecer: "✅ Workers rodando e aguardando jobs..."
-- 5. Sem mais erros de "column does not exist"
-- ============================================
