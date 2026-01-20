# Deploy: Monitores Webhook

## ✅ Imagens Docker Prontas

**API Image:**
- Tag: `ghcr.io/rodnickel/taco-api:latest`
- Digest: `sha256:6329a2cfc5d3991eb26609b14dfb2ad9d5055f763649ec450e25ebdab6728b70`

**Web Image (já atualizada anteriormente):**
- Tag: `ghcr.io/rodnickel/taco-web:latest`
- Digest: `sha256:d9d0662b627d8b782e683720659c1f986c234850ed149339ed278328f98104bb`

## 📋 Passo a Passo do Deploy

### 1. Aplicar Migration no Banco de Produção

**IMPORTANTE:** Faça backup do banco antes!

```bash
# Conectar ao container do PostgreSQL
docker exec -it <postgres-container-id> psql -U taco -d taco
```

Ou conecte via cliente SQL e execute:

```sql
-- Migration: add_webhook_monitor_type
-- Adiciona suporte a monitores do tipo Webhook

-- AlterTable: Adiciona campos para webhook monitors
ALTER TABLE "monitors" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'http';
ALTER TABLE "monitors" ADD COLUMN IF NOT EXISTS "webhook_token" TEXT;
ALTER TABLE "monitors" ADD COLUMN IF NOT EXISTS "webhook_secret" TEXT;
ALTER TABLE "monitors" ADD COLUMN IF NOT EXISTS "heartbeat_interval" INTEGER DEFAULT 300;
ALTER TABLE "monitors" ADD COLUMN IF NOT EXISTS "last_heartbeat" TIMESTAMP(3);

-- CreateIndex: Índice para webhook_token (unique)
CREATE UNIQUE INDEX IF NOT EXISTS "monitors_webhook_token_key" ON "monitors"("webhook_token");

-- CreateIndex: Índices para otimização
CREATE INDEX IF NOT EXISTS "monitors_type_idx" ON "monitors"("type");
CREATE INDEX IF NOT EXISTS "monitors_webhook_token_idx" ON "monitors"("webhook_token");

-- Verificar que todos os monitores existentes estão com type='http'
UPDATE "monitors" SET "type" = 'http' WHERE "type" IS NULL;

-- Commit
COMMIT;
```

**Verificar migration aplicada:**
```sql
-- Listar colunas da tabela monitors
\d monitors

-- Verificar índices
\di monitors*
```

### 2. Fazer Repull no Portainer

1. Acesse o Portainer: https://seu-portainer.com
2. Navegue para **Stacks** > **taco**
3. Clique em **Editor**
4. Role até o final e clique em **Update the stack**
5. Marque **Re-pull image and redeploy**
6. Clique em **Update**

Isso vai:
- ✅ Fazer pull das novas imagens (API + Web já está atualizada)
- ✅ Recriar os containers com as novas versões
- ✅ Iniciar o worker com suporte a webhook heartbeat

### 3. Verificar Logs

**Logs da API:**
```bash
docker logs -f <taco-api-container-id> --tail 100
```

Procure por:
```
✅ Rotas de webhooks registradas
```

**Logs do Worker:**
```bash
docker logs -f <taco-worker-container-id> --tail 100
```

Procure por:
```
✅ Verificador de heartbeat webhook agendado (a cada 60s)
```

### 4. Testar Webhook Monitor

#### Criar um Monitor Webhook

```bash
# Via API
curl -X POST https://taco.movetoup.com.br/api/monitors \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Team-Id: SEU_TEAM_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Webhook",
    "type": "webhook",
    "url": "https://example.com",
    "heartbeatInterval": 300,
    "alertsEnabled": true
  }'
```

**Resposta esperada:**
```json
{
  "id": "cm5...",
  "name": "Teste Webhook",
  "type": "webhook",
  "webhookToken": "a1b2c3d4e5f6...64chars",
  "webhookUrl": "https://taco.movetoup.com.br/api/webhooks/a1b2c3d4e5f6...",
  "currentStatus": null,
  "active": true
}
```

#### Testar Envio de Status

```bash
# Substitua TOKEN_DO_MONITOR pelo token recebido
WEBHOOK_TOKEN="cole-o-token-aqui"

# Enviar status UP
curl -X POST https://taco.movetoup.com.br/api/webhooks/$WEBHOOK_TOKEN \
  -H "Content-Type: application/json" \
  -d '{
    "status": "up",
    "message": "Serviço operacional"
  }'

# Enviar status DOWN
curl -X POST https://taco.movetoup.com.br/api/webhooks/$WEBHOOK_TOKEN \
  -H "Content-Type: application/json" \
  -d '{
    "status": "down",
    "message": "Serviço fora do ar"
  }'

# Enviar heartbeat
curl https://taco.movetoup.com.br/api/webhooks/$WEBHOOK_TOKEN/heartbeat
```

#### Verificar Status no Dashboard

1. Acesse o dashboard
2. Navegue para Monitores
3. Veja o monitor webhook criado
4. Status deve estar atualizado conforme o que você enviou

## 🔍 Troubleshooting

### Migration falha com "column already exists"

Isso é normal se a migration já foi aplicada. Verifique:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'monitors'
  AND column_name IN ('type', 'webhook_token', 'webhook_secret', 'heartbeat_interval', 'last_heartbeat');
```

Se as colunas já existem, a migration já foi aplicada.

### Worker não inicia

Verifique os logs:
```bash
docker logs <worker-container-id>
```

Erros comuns:
- `Cannot find module './workers/webhook-heartbeat.worker.js'` → Build incompleto, faça repull
- `JWT_SECRET is required` → Variável de ambiente faltando no Portainer

### Webhook retorna 404

Verifique:
1. Token está correto
2. Monitor está ativo (`active: true`)
3. Monitor é do tipo webhook (`type: 'webhook'`)
4. Rota está registrada (verifique logs da API no startup)

### Heartbeat não funciona

Verifique:
1. Monitor tem `heartbeatInterval` configurado (ex: 300)
2. Worker está rodando
3. Logs do worker mostram: `[Webhook Heartbeat] Verificando heartbeats expirados...`

## 📊 Monitoramento Pós-Deploy

### Queries Úteis

```sql
-- Ver todos os monitores webhook
SELECT id, name, type, webhook_token, current_status, last_heartbeat
FROM monitors
WHERE type = 'webhook';

-- Ver monitores com heartbeat expirado
SELECT
  id,
  name,
  last_heartbeat,
  heartbeat_interval,
  EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) as seconds_since_heartbeat
FROM monitors
WHERE type = 'webhook'
  AND heartbeat_interval IS NOT NULL
  AND last_heartbeat IS NOT NULL
ORDER BY seconds_since_heartbeat DESC;

-- Ver checks de monitores webhook
SELECT m.name, c.status, c.checked_at, c.error
FROM checks c
JOIN monitors m ON m.id = c.monitor_id
WHERE m.type = 'webhook'
ORDER BY c.checked_at DESC
LIMIT 20;
```

### Logs para Monitorar

**API:**
```
[Webhook] Webhook recebido para monitor: <nome>
[Webhook] Status mudou de <old> para <new>
[Webhook] Alerta disparado: <alert-name>
```

**Worker:**
```
[Webhook Heartbeat] Verificando heartbeats expirados...
[Webhook Heartbeat] Monitor <nome> sem heartbeat há Xs - marcando como DOWN
[Webhook Heartbeat] Job completed
```

## 🎯 Próximos Passos

1. ✅ Deploy do backend (API + Worker)
2. ✅ Migration aplicada
3. ⬜ Criar UI no frontend para monitores webhook
4. ⬜ Documentar integração com 360Dialog
5. ⬜ Testar em produção com serviço real

## 📝 Checklist Final

- [ ] Backup do banco feito
- [ ] Migration aplicada com sucesso
- [ ] Repull feito no Portainer
- [ ] API iniciou sem erros
- [ ] Worker iniciou sem erros
- [ ] Worker mostra "Verificador de heartbeat webhook agendado"
- [ ] Teste manual de webhook funcionou
- [ ] Status page mostra histórico correto (fix anterior)
- [ ] Pricing page mostra plano atual (fix anterior)

---

**Data:** 2026-01-20
**Versão API:** `sha256:6329a2cfc...`
**Versão Web:** `sha256:d9d0662b6...`
**Status:** ✅ Pronto para deploy
