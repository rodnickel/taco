# 🚨 APLICAR MIGRATION EM PRODUÇÃO - URGENTE

## Problema Identificado

Workers estão crashando com erro:
```
The column `monitors.type` does not exist in the current database.
```

**Causa:** A migration `add_webhook_monitor_type` NÃO foi aplicada no banco de produção.

**Impacto:**
- ❌ Workers crashando continuamente
- ❌ Monitores HTTP não estão sendo verificados
- ❌ Página de status possivelmente com erro
- ❌ API pode estar com problemas

---

## 📋 PASSO A PASSO PARA APLICAR A MIGRATION

### 1. Fazer Backup do Banco (OBRIGATÓRIO)

```bash
# Via Docker (ajuste o container ID)
docker exec <postgres-container-id> pg_dump -U taco taco > backup_antes_migration_$(date +%Y%m%d_%H%M%S).sql

# Ou via pgAdmin/DBeaver: Export > SQL Dump
```

### 2. Conectar ao Banco de Produção

**Opção A: Via Docker (recomendado)**
```bash
# Listar containers para encontrar o PostgreSQL
docker ps | grep postgres

# Conectar ao psql
docker exec -it <postgres-container-id> psql -U taco -d taco
```

**Opção B: Via cliente SQL (pgAdmin, DBeaver, etc)**
```
Host: seu-servidor.com
Port: 5432
Database: taco
User: taco
Password: <sua-senha>
```

### 3. Verificar Estado Atual (ANTES da Migration)

Execute este SQL para verificar o estado atual:

```sql
-- Verificar colunas atuais da tabela monitors
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'monitors'
ORDER BY ordinal_position;

-- Contar quantos monitores existem
SELECT COUNT(*) as total_monitors FROM monitors;

-- Ver alguns monitores
SELECT id, name, url, active, current_status FROM monitors LIMIT 5;
```

**Salve esta saída para comparação depois!**

### 4. Aplicar a Migration

Cole e execute este SQL completo:

```sql
-- ============================================
-- Migration: add_webhook_monitor_type
-- Data: 2026-01-20
-- Descrição: Adiciona suporte a monitores tipo Webhook
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

-- Exibir resultado
SELECT 'Migration aplicada com sucesso!' as status;
```

### 5. Verificar Migration Aplicada (DEPOIS)

```sql
-- Verificar novas colunas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'monitors'
  AND column_name IN ('type', 'webhook_token', 'webhook_secret', 'heartbeat_interval', 'last_heartbeat');

-- Verificar índices criados
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'monitors'
  AND indexname LIKE '%webhook%' OR indexname LIKE '%type%';

-- Verificar que todos os monitores têm type='http'
SELECT type, COUNT(*) as quantidade
FROM monitors
GROUP BY type;
```

**Resultado esperado:**
```
 column_name        | data_type           | is_nullable | column_default
--------------------+---------------------+-------------+---------------
 type               | text                | NO          | 'http'
 webhook_token      | text                | YES         | NULL
 webhook_secret     | text                | YES         | NULL
 heartbeat_interval | integer             | YES         | 300
 last_heartbeat     | timestamp(3)        | YES         | NULL
```

### 6. Reiniciar Containers

Após aplicar a migration, os workers devem parar de crashar automaticamente, mas é bom reiniciar:

**Via Portainer:**
1. Acesse Portainer
2. Vá em Stacks > taco
3. Clique nos 3 pontinhos do stack
4. "Stop" e depois "Start"

**Via Docker CLI:**
```bash
# Reiniciar apenas o worker
docker restart <taco-worker-container-id>

# Ou reiniciar toda a stack
docker stack ps taco
docker service update --force taco_api
docker service update --force taco_worker
```

### 7. Verificar Logs (CRÍTICO)

Após reiniciar, verifique se os workers iniciam corretamente:

```bash
# Logs do worker
docker logs -f <taco-worker-container-id> --tail 50
```

**Logs esperados (SUCESSO):**
```
🚀 Iniciando Monitor Check Worker...
✅ Conectado ao Redis
✅ Conectado ao PostgreSQL
📋 Agendando verificações para X monitores HTTP...
✅ Verificador de escalonamento agendado
✅ Verificador de SSL agendado (diariamente às 09:00)
✅ Verificador de heartbeat webhook agendado (a cada 60s)
✅ Workers rodando e aguardando jobs...
```

**Se ainda houver erro:**
```
❌ Erro ao iniciar worker: PrismaClientKnownRequestError:
Invalid `prisma.monitor.findMany()` invocation:
The column `monitors.type` does not exist in the current database.
```

→ A migration NÃO foi aplicada corretamente. Verifique:
1. Você está conectado no banco certo?
2. O SQL foi executado com sucesso (sem erros)?
3. Execute novamente a verificação do passo 5

---

## 🔍 Troubleshooting

### Erro: "column already exists"

Isso é NORMAL se você já tentou aplicar a migration antes. Basta verificar se todas as colunas estão lá:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'monitors'
  AND column_name IN ('type', 'webhook_token', 'webhook_secret', 'heartbeat_interval', 'last_heartbeat');
```

Se retornar as 5 colunas, a migration já foi aplicada!

### Erro: "relation already exists" (índices)

Também é normal. O `IF NOT EXISTS` deveria prevenir isso, mas se acontecer, ignore.

### Workers continuam crashando após migration

1. **Verificar se a migration foi mesmo aplicada:**
   ```sql
   \d monitors
   ```

2. **Limpar cache do Prisma Client:**
   ```bash
   # Dentro do container da API/Worker
   docker exec -it <container> rm -rf /app/node_modules/.prisma
   docker restart <container>
   ```

3. **Verificar DATABASE_URL:**
   ```bash
   docker exec -it <worker-container> env | grep DATABASE_URL
   ```

   Certifique-se que aponta para o banco correto!

### Página de status ainda mostra só "Hoje"

Depois que os workers voltarem a funcionar:

1. Aguarde alguns minutos para novos checks serem criados
2. Verifique se há checks históricos no banco:
   ```sql
   SELECT DATE(checked_at) as dia, COUNT(*) as checks
   FROM checks
   WHERE monitor_id IN (SELECT id FROM monitors WHERE active = true)
   GROUP BY DATE(checked_at)
   ORDER BY dia DESC
   LIMIT 10;
   ```

3. Se não houver checks antigos, o problema é que **os dados realmente não existem** (workers estavam crashando há dias)

---

## ✅ Checklist Final

- [ ] Backup do banco feito
- [ ] Conectado ao banco de produção
- [ ] Estado ANTES da migration verificado e salvo
- [ ] Migration SQL executada com sucesso
- [ ] Estado DEPOIS da migration verificado
- [ ] Todas as 5 colunas criadas
- [ ] Todos os índices criados
- [ ] Todos os monitores com `type='http'`
- [ ] Containers reiniciados
- [ ] Logs do worker mostram: "✅ Workers rodando e aguardando jobs..."
- [ ] Sem erros de "column does not exist"
- [ ] Monitores sendo verificados normalmente
- [ ] Página de status funcionando

---

## 📞 Se Precisar de Ajuda

Se encontrar algum erro não documentado aqui:

1. **NÃO entre em pânico** - você fez backup!
2. Copie o erro completo
3. Verifique qual passo exato falhou
4. Me mostre o erro para eu te ajudar

---

**Data:** 2026-01-22
**Urgência:** ALTA - Workers em crash loop
**Tempo estimado:** 5-10 minutos (se tudo der certo)
