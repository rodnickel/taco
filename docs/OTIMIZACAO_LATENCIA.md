# Otimização de Latência dos Monitores

## 🐌 Problema Identificado

Latência reportada pelo monitor: **430-533ms**
Latência real do ping: **10ms**

### Análise de Latência (do servidor de produção):

```
DNS Lookup:        116ms  ⚠️ MUITO ALTO
TCP Connect:       127ms  (total acumulado)
TLS Handshake:     151ms  (total acumulado)
Tempo até 1º byte: 413ms  (total acumulado)
Tempo Total:       533ms
```

### Problemas Encontrados:

1. **DNS Lookup Lento (116ms)**
   - Node.js não faz cache de DNS por padrão
   - Cada requisição faz um novo DNS lookup
   - Deveria ser ~10-20ms, estava 116ms

2. **Sem Keep-Alive**
   - Cada requisição abre uma nova conexão TCP
   - TCP handshake + TLS handshake a cada check
   - Adiciona ~150ms de overhead

3. **Servidor de Origem Lento**
   - TTFB (Time To First Byte): 413ms
   - Isso é do servidor `uniitalo.com.br`, não podemos controlar

## ✅ Soluções Implementadas

### 1. DNS Cache (`cacheable-lookup`)

Adiciona cache de DNS para evitar lookups repetidos:

```typescript
import CacheableLookup from 'cacheable-lookup'

const dnsCache = new CacheableLookup()
```

**Benefício:**
- DNS lookup: **116ms → ~1-5ms** (23x mais rápido)
- Cache por 5 minutos (padrão)

### 2. HTTP Agent com Keep-Alive

Reutiliza conexões TCP/TLS entre requisições:

```typescript
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000, // 30s
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000,
})

dnsCache.install(httpsAgent)
```

**Benefício:**
- Evita TCP handshake: **~10-20ms** economizados
- Evita TLS handshake: **~50-70ms** economizados
- Total: **~60-90ms** de economia por requisição (após a primeira)

### 3. Configurações Otimizadas

- `maxSockets: 50` - Até 50 conexões simultâneas
- `maxFreeSockets: 10` - Mantém 10 conexões livres em cache
- `keepAliveMsecs: 30000` - Conexões ficam vivas por 30s

## 📊 Resultado Esperado

### Antes (sem otimizações):
```
Primeira requisição:  530ms
Segunda requisição:   530ms  (mesmo overhead toda vez)
Terceira requisição:  530ms
```

### Depois (com otimizações):
```
Primeira requisição:  530ms  (ainda precisa fazer DNS + TCP + TLS)
Segunda requisição:  250ms  (reusa conexão, DNS em cache)
Terceira requisição:  250ms  (reusa conexão, DNS em cache)
Média após aquecimento: ~250ms (redução de 53%)
```

## 🚀 Como Aplicar

### 1. Instalar Dependência

```bash
npm install cacheable-lookup
```

### 2. Rebuild e Deploy

```bash
# Build das imagens
npm run docker:build

# Push para registry
docker push ghcr.io/rodnickel/taco-api:latest

# No Portainer: Repull + Restart
```

### 3. Verificar Logs

Após deploy, verifique os logs do worker:

```bash
docker logs -f taco_worker --tail 50
```

Procure por:
```
✅ Workers rodando e aguardando jobs...
```

## 📈 Monitoramento

### Antes do Deploy

```sql
-- Ver latência média atual
SELECT
  m.name,
  AVG(c.latency) as avg_latency_ms,
  MIN(c.latency) as min_latency_ms,
  MAX(c.latency) as max_latency_ms
FROM checks c
JOIN monitors m ON m.id = c.monitor_id
WHERE c.checked_at > NOW() - INTERVAL '1 hour'
GROUP BY m.id, m.name;
```

### Depois do Deploy

Execute a mesma query e compare os resultados.

**Esperado:**
- Latência média: **redução de 40-50%**
- Primeira requisição: mesma latência
- Requisições seguidas: muito mais rápidas

## 🔍 Troubleshooting

### Latência ainda alta após deploy

1. **Verificar se as otimizações foram aplicadas:**
   ```bash
   # Dentro do container
   docker exec -it taco_worker cat /app/dist/workers/monitor-check.worker.js | grep -A5 "cacheable-lookup"
   ```

2. **Testar latência direto do container:**
   ```bash
   docker exec -it taco_worker node -e "
   const start = Date.now();
   fetch('https://uniitalo.com.br').then(res => {
     console.log('Latência:', Date.now() - start + 'ms');
   });
   setTimeout(() => {}, 2000);
   "
   ```

3. **Verificar se o servidor de origem está lento:**
   - Se TTFB > 300ms, o problema está no servidor de origem
   - Nesse caso, considere usar CDN (Cloudflare, etc)

### Erro: "Cannot find module 'cacheable-lookup'"

- Build não incluiu a dependência
- Execute: `npm install` antes do build
- Verifique se `node_modules` está no context do Docker

## 📝 Notas Técnicas

### Por que 430ms não é 10ms?

- **Ping (ICMP):** Apenas ida e volta da rede
- **HTTP/HTTPS:** DNS + TCP + TLS + HTTP request + response
- **Latência legítima:** ~100-200ms para HTTPS completo
- **Overhead evitável:** ~100-200ms (DNS + conexões repetidas)

### Limitações

- **Primeira requisição:** Sempre será mais lenta (cold start)
- **TTFB do servidor:** Não podemos otimizar isso pelo worker
- **Localização geográfica:** Se servidor está longe, latência de rede é inevitável

### Próximas Melhorias

1. **Worker em múltiplas regiões** (distributed monitoring)
2. **HTTP/2** (multiplexing, header compression)
3. **Warm-up das conexões** (pré-aquecimento)
4. **Métricas separadas** (DNS time, connect time, transfer time)

---

**Data:** 2026-01-23
**Status:** ✅ Pronto para deploy
**Redução esperada:** 40-50% na latência média
