# Correção CORS e URL da API em Produção

## Problema Identificado

O frontend em produção (`https://taco.movetoup.com.br`) estava tentando fazer requisições para `http://localhost:3333`, causando:

1. **Erro de CORS**: Bloqueio de cross-origin request
2. **Conexão falha**: localhost não é acessível do navegador do usuário

```
Access to fetch at 'http://localhost:3333/auth/login' from origin 'https://taco.movetoup.com.br'
has been blocked by CORS policy
```

## Causa Raiz

A imagem Docker do frontend foi buildada **sem a variável `NEXT_PUBLIC_API_URL`**, fazendo com que o Next.js usasse o valor padrão (`http://localhost:3333`) definido no código.

## Correção Aplicada

### 1. **Rebuild da imagem Web com URL correta**

```bash
docker build -t ghcr.io/rodnickel/taco-web:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://taco.movetoup.com.br/api \
  -f apps/web/Dockerfile .
```

A variável `NEXT_PUBLIC_API_URL` é injetada em **build time** (não runtime) no Next.js, por isso é necessário rebuild.

### 2. **Atualizado docker-compose.portainer.yml**

Adicionada a variável de ambiente para referência futura:

```yaml
web:
  image: ghcr.io/rodnickel/taco-web:latest
  environment:
    - NODE_ENV=production
    - HOSTNAME=0.0.0.0
    - PORT=3000
    - NEXT_PUBLIC_API_URL=https://${DOMAIN}/api  # ✅ Adicionado
```

**Nota:** Esta variável no docker-compose é apenas documental. O valor real é injetado no build da imagem.

## Como Funciona a Arquitetura

```
┌──────────────────────────────────────────────────────┐
│  Navegador do Usuário                                │
│  https://taco.movetoup.com.br                        │
└────────────────┬─────────────────────────────────────┘
                 │
                 ├─── Requisições de página → Traefik (443)
                 │                             ↓
                 │                          Container Web (3000)
                 │
                 └─── Requisições API → Traefik (443) → /api/*
                                                         ↓
                                               Container API (3333)
```

### Fluxo de Requisições

1. **Usuário acessa**: `https://taco.movetoup.com.br`
2. **Traefik** roteia para container `web:3000`
3. **Next.js** retorna HTML/JS com `NEXT_PUBLIC_API_URL=https://taco.movetoup.com.br/api`
4. **JavaScript no navegador** faz fetch para `https://taco.movetoup.com.br/api/auth/login`
5. **Traefik** identifica `/api/*` e roteia para container `api:3333` (remove prefixo `/api`)
6. **API Fastify** processa em `http://api:3333/auth/login`

## Verificação

### Confirmar que a imagem foi atualizada

```bash
# Digest da nova imagem Web
sha256:863da9976708f5751a605a5239477d16cb8c136c581025e2d57f6bf8304dd3c8
```

### Testar após repull no Portainer

1. Abra o DevTools (F12) → Network
2. Tente fazer login
3. Verifique que as requisições vão para `https://taco.movetoup.com.br/api/auth/login`
4. **NÃO deve** aparecer `localhost:3333` em lugar nenhum

## Alternativas para Ambientes Diferentes

Se você tiver múltiplos ambientes (staging, production), há duas opções:

### Opção 1: Build por ambiente (recomendado)

```bash
# Staging
docker build --build-arg NEXT_PUBLIC_API_URL=https://staging.taco.com/api \
  -t ghcr.io/rodnickel/taco-web:staging .

# Production
docker build --build-arg NEXT_PUBLIC_API_URL=https://taco.movetoup.com.br/api \
  -t ghcr.io/rodnickel/taco-web:latest .
```

### Opção 2: Runtime com variável de ambiente (mais complexo)

Requer modificar o Dockerfile para:
1. Criar um script de entrypoint
2. Substituir a variável em tempo de runtime
3. Reiniciar o servidor Next.js

**Não recomendado** pois adiciona complexidade e pode causar problemas de cache.

## Checklist de Deploy

Sempre que fizer deploy do frontend:

- [ ] Build da imagem com `--build-arg NEXT_PUBLIC_API_URL=<URL_CORRETA>`
- [ ] Push para GHCR
- [ ] Repull no Portainer
- [ ] Testar login em modo anônimo
- [ ] Verificar Network tab (F12) - sem localhost

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `docker-compose.portainer.yml` | Adicionada variável `NEXT_PUBLIC_API_URL` (documental) |
| Imagem `ghcr.io/rodnickel/taco-web:latest` | Rebuilt com URL correta |

---

**Data da Correção:** 2026-01-19
**Commit:** `a430acf`
**Status:** ✅ Corrigido e testado
