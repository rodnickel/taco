# Monitores do Tipo Webhook

## Visão Geral

Monitores webhook são monitores **passivos** que recebem atualizações de status de plataformas externas, ao invés de fazer requisições HTTP periódicas (polling ativo).

## Casos de Uso

- **Plataformas de comunicação**: 360Dialog, Twilio, WhatsApp Business API
- **Serviços de pagamento**: Stripe, Asaas, Mercado Pago
- **CI/CD**: GitHub Actions, GitLab CI, CircleCI
- **Serviços de infraestrutura**: AWS, Azure, GCP
- **Aplicações próprias**: Qualquer serviço que possa enviar webhooks

## Como Funciona

```
┌─────────────────────────────────────────────────────────┐
│  Plataforma Externa (360Dialog, etc)                    │
│  Status mudou: operational → degraded                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ POST https://taco.com/webhooks/{token}
                   │ Body: { "status": "degraded" }
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Taco API                                                │
│  1. Valida token                                         │
│  2. Valida assinatura HMAC (se configurado)             │
│  3. Atualiza status do monitor                          │
│  4. Cria registro de Check                              │
│  5. Dispara alertas (se status mudou)                   │
│  6. Cria/resolve incidentes                             │
└─────────────────────────────────────────────────────────┘
```

## Diferenças vs Monitor HTTP

| Aspecto | Monitor HTTP | Monitor Webhook |
|---------|--------------|-----------------|
| **Tipo de verificação** | Ativa (polling) | Passiva (push) |
| **Quem inicia** | Taco faz requisição | Serviço externo envia |
| **Intervalo** | Configurável (30s a 5min) | Quando o serviço enviar |
| **Latência** | Medida pela requisição | Não aplicável |
| **Heartbeat** | Não necessário | Opcional (detecta falha de comunicação) |
| **Overhead** | Alto (requisições frequentes) | Baixo (apenas recebe) |
| **Worker** | Processado pelo monitor-check | Processado no próprio endpoint |

## Configuração de Monitor Webhook

### Campos do Banco de Dados

```typescript
model Monitor {
  // ... campos existentes

  type String @default("http") // "http" | "webhook"

  // Configurações específicas para webhook
  webhookToken String? @unique // Token único para o endpoint
  webhookSecret String? // Secret para validar HMAC
  heartbeatInterval Int? @default(300) // Segundos entre heartbeats esperados
  lastHeartbeat DateTime? // Último heartbeat recebido
}
```

### Criando um Monitor Webhook

```typescript
POST /monitors
{
  "name": "360Dialog - Status",
  "type": "webhook",
  "url": "https://360dialog.com", // Apenas documental
  "heartbeatInterval": 300, // 5 minutos
  "webhookSecret": "seu-secret-compartilhado", // Opcional
  "alertsEnabled": true
}
```

**Resposta:**
```json
{
  "id": "cm5abc123",
  "name": "360Dialog - Status",
  "type": "webhook",
  "webhookToken": "a1b2c3d4e5f6...64chars",
  "webhookUrl": "https://taco.com/webhooks/a1b2c3d4e5f6...64chars",
  "heartbeatUrl": "https://taco.com/webhooks/a1b2c3d4e5f6...64chars/heartbeat"
}
```

## Endpoints de Webhook

### 1. Atualização de Status

```
POST /webhooks/:token
Content-Type: application/json
X-Webhook-Signature: <hmac-sha256-signature> (se webhookSecret configurado)

{
  "status": "up" | "down" | "degraded",
  "message": "Descrição opcional do status",
  "metadata": {
    // Dados adicionais opcionais
    "source": "360dialog-api",
    "region": "us-east-1"
  }
}
```

**Validação de Assinatura (se webhookSecret configurado):**
```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(body))
  .digest('hex')

// Enviar no header: X-Webhook-Signature: <signature>
```

**Respostas:**

✅ **200 Success:**
```json
{
  "success": true,
  "monitor": {
    "id": "cm5abc123",
    "name": "360Dialog - Status",
    "status": "degraded"
  }
}
```

❌ **404 Not Found:**
```json
{
  "error": "Monitor não encontrado ou token inválido"
}
```

❌ **401 Unauthorized:**
```json
{
  "error": "Assinatura webhook inválida"
}
```

### 2. Heartbeat (Opcional)

```
GET /webhooks/:token/heartbeat
```

Endpoint simples para indicar que o serviço está vivo. Se o monitor tiver `heartbeatInterval` configurado e não receber heartbeat dentro do intervalo + 60s, será marcado como DOWN automaticamente.

**Resposta:**
```json
{
  "success": true,
  "monitor": {
    "id": "cm5abc123",
    "name": "360Dialog - Status",
    "lastHeartbeat": "2026-01-20T10:30:00.000Z"
  }
}
```

## Sistema de Heartbeat

O heartbeat é opcional mas recomendado para detectar quando a comunicação entre o serviço externo e o Taco foi interrompida.

### Como Funciona

1. **Configure** `heartbeatInterval` ao criar o monitor (ex: 300 segundos = 5 minutos)
2. **Serviço externo** envia GET `/webhooks/:token/heartbeat` periodicamente
3. **Worker** verifica a cada 60s se algum monitor webhook está sem heartbeat
4. Se `lastHeartbeat` for mais antigo que `heartbeatInterval + 60s`, marca como DOWN

### Exemplo de Implementação (Node.js)

```javascript
const webhookToken = 'seu-token-aqui'
const heartbeatUrl = `https://taco.com/webhooks/${webhookToken}/heartbeat`

// Envia heartbeat a cada 4 minutos (intervalo configurado: 5min)
setInterval(async () => {
  try {
    await fetch(heartbeatUrl)
    console.log('Heartbeat enviado')
  } catch (error) {
    console.error('Erro ao enviar heartbeat:', error)
  }
}, 4 * 60 * 1000)
```

## Integração com 360Dialog

### 1. Criar Monitor Webhook no Taco

```bash
curl -X POST https://taco.com/api/monitors \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Team-Id: YOUR_TEAM_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "360Dialog - WhatsApp Channel",
    "type": "webhook",
    "url": "https://waba.360dialog.io",
    "heartbeatInterval": 300,
    "alertsEnabled": true
  }'
```

### 2. Configurar Webhook na 360Dialog

Na 360Dialog, configure o webhook URL:
```
https://taco.com/webhooks/SEU_TOKEN_AQUI
```

### 3. Script para Enviar Status (exemplo)

```javascript
// Seu backend que monitora a 360Dialog
async function notifyTaco(status) {
  const webhookToken = process.env.TACO_WEBHOOK_TOKEN

  await fetch(`https://taco.com/webhooks/${webhookToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: status, // 'up', 'down', 'degraded'
      message: `360Dialog channel status: ${status}`,
      metadata: {
        channel: 'whatsapp',
        provider: '360dialog'
      }
    })
  })
}

// Exemplo de uso
try {
  const response = await fetch('https://waba.360dialog.io/v1/health')
  if (response.ok) {
    await notifyTaco('up')
  } else {
    await notifyTaco('degraded')
  }
} catch (error) {
  await notifyTaco('down')
}
```

## Worker de Heartbeat

O worker `webhook-heartbeat.worker.ts` verifica a cada 60 segundos se algum monitor webhook está sem heartbeat:

```typescript
// Verifica monitores com heartbeat configurado
const monitors = await prisma.monitor.findMany({
  where: {
    type: 'webhook',
    active: true,
    heartbeatInterval: { not: null }
  }
})

for (const monitor of monitors) {
  const secondsSinceHeartbeat = (now - lastHeartbeat) / 1000
  const threshold = heartbeatInterval + 60

  if (secondsSinceHeartbeat > threshold) {
    // Marca como DOWN e dispara alertas
  }
}
```

## Segurança

### 1. Token Único

Cada monitor webhook recebe um token único de 64 caracteres (256 bits):
```typescript
generateWebhookToken() // crypto.randomBytes(32).toString('hex')
```

### 2. Assinatura HMAC (Opcional)

Para garantir que as requisições vêm da plataforma correta:

```typescript
// Servidor externo
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(body))
  .digest('hex')

headers['X-Webhook-Signature'] = signature
```

```typescript
// Taco valida
const expectedSignature = crypto
  .createHmac('sha256', monitor.webhookSecret)
  .update(JSON.stringify(body))
  .digest('hex')

if (signature !== expectedSignature) {
  return 401 Unauthorized
}
```

## Migration

```sql
-- 20260120102018_add_webhook_monitor_type/migration.sql
ALTER TABLE "monitors" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'http';
ALTER TABLE "monitors" ADD COLUMN "webhook_token" TEXT;
ALTER TABLE "monitors" ADD COLUMN "webhook_secret" TEXT;
ALTER TABLE "monitors" ADD COLUMN "heartbeat_interval" INTEGER DEFAULT 300;
ALTER TABLE "monitors" ADD COLUMN "last_heartbeat" TIMESTAMP(3);

CREATE UNIQUE INDEX "monitors_webhook_token_key" ON "monitors"("webhook_token");
CREATE INDEX "monitors_type_idx" ON "monitors"("type");
CREATE INDEX "monitors_webhook_token_idx" ON "monitors"("webhook_token");
```

## Testes

### Testar Webhook Manualmente

```bash
# Obter o token do monitor
WEBHOOK_TOKEN="seu-token-aqui"

# Enviar status UP
curl -X POST https://taco.com/webhooks/$WEBHOOK_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"status": "up", "message": "Tudo funcionando"}'

# Enviar status DOWN
curl -X POST https://taco.com/webhooks/$WEBHOOK_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"status": "down", "message": "Serviço fora do ar"}'

# Enviar heartbeat
curl https://taco.com/webhooks/$WEBHOOK_TOKEN/heartbeat
```

## Arquivos Criados/Modificados

| Arquivo | Descrição |
|---------|-----------|
| `prisma/schema.prisma` | Adicionado campos type, webhookToken, webhookSecret, heartbeatInterval, lastHeartbeat |
| `prisma/migrations/.../migration.sql` | Migration para adicionar colunas |
| `src/modules/webhooks/webhooks.routes.ts` | Rotas públicas para receber webhooks |
| `src/modules/webhooks/webhooks.service.ts` | Lógica de processamento de webhooks |
| `src/modules/webhooks/webhooks.schema.ts` | Schema Zod para validação |
| `src/workers/webhook-heartbeat.worker.ts` | Worker que verifica heartbeats expirados |
| `src/workers/monitor-check.worker.ts` | Modificado para excluir monitores webhook |
| `src/worker.ts` | Registrado webhook-heartbeat worker |
| `src/server.ts` | Registrado webhooks routes |

## Próximas Melhorias

1. ✅ Implementação básica de webhook monitors
2. ⬜ UI no frontend para criar monitores webhook
3. ⬜ Exibir URL e token do webhook na interface
4. ⬜ Botão para copiar URL/token
5. ⬜ Log de webhooks recebidos
6. ⬜ Estatísticas de webhooks (quantidade recebida, última vez, etc)
7. ⬜ Regenerar token de webhook
8. ⬜ Rate limiting nos endpoints de webhook
9. ⬜ Suporte a múltiplos formatos de webhook (Slack, Discord, etc)
10. ⬜ Transformação de payload (mapear campos customizados para status)

---

**Data:** 2026-01-20
**Status:** ✅ Backend implementado - Pronto para deploy
**Próximo passo:** Testar migration e deploy da API
