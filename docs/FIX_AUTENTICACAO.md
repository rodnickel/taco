# Correção de Bugs de Autenticação

## Problemas Identificados e Corrigidos

### 1. ✅ Bug Crítico: Novos Usuários Sem Subscription

**Problema:**
- Ao registrar um novo usuário através do `/auth/register`, o time pessoal era criado **sem subscription**
- Isso causava erro 500 ao tentar carregar dados do time (TeamContext) pois o endpoint `/teams/:id/usage` falhava
- Apenas funcionava na sua máquina porque seu usuário foi criado antes do bug ou através de outro fluxo

**Localização do Bug:**
- Arquivo: `apps/api/src/modules/auth/auth.service.ts`
- Função: `register()`

**Correção Aplicada:**
```typescript
// ANTES (BUGADO)
await tx.team.create({
  data: {
    name: data.name ? `Time de ${data.name}` : 'Meu Time',
    slug: uniqueSlug,
    ownerId: user.id,
    members: {
      create: { userId: user.id, role: 'ADMIN' }
    }
    // ❌ Faltando: subscription!
  }
})

// DEPOIS (CORRIGIDO)
const freePlan = await tx.plan.findUnique({ where: { slug: 'free' } })
if (!freePlan) {
  throw new AuthError('Plano Free não encontrado', 'PLAN_NOT_FOUND', 500)
}

await tx.team.create({
  data: {
    name: data.name ? `Time de ${data.name}` : 'Meu Time',
    slug: uniqueSlug,
    ownerId: user.id,
    members: {
      create: { userId: user.id, role: 'ADMIN' }
    },
    subscription: {  // ✅ Agora cria subscription!
      create: {
        planId: freePlan.id,
        status: 'ACTIVE'
      }
    }
  }
})
```

**Por que funcionava na sua máquina:**
- Provavelmente você criou seu usuário antes dessa implementação e executou o script de migration que atribuiu plano Free aos times existentes
- Ou você criou o usuário através de outro fluxo que já criava a subscription corretamente

---

## Como Testar em Outro Dispositivo

### Pré-requisitos:
1. API deve estar acessível na rede (não apenas localhost)
2. Frontend deve estar configurado para apontar para a API

### Opção 1: Testar na Mesma Rede Local

1. **Descobrir seu IP local:**
   ```bash
   # Windows
   ipconfig | findstr "IPv4"

   # Linux/Mac
   ifconfig | grep "inet "
   ```

2. **Configurar a API (se necessário):**
   - A API já está configurada para escutar em `0.0.0.0:3333` (aceita conexões de qualquer interface)
   - Certifique-se que o firewall permite conexões na porta 3333

3. **Acessar do outro dispositivo:**
   ```
   http://SEU_IP_LOCAL:3000
   ```

### Opção 2: Testar com Novo Usuário (Mesma Máquina)

1. **Abrir navegador em modo anônimo**
2. **Criar nova conta** em `http://localhost:3000/register`
3. **Verificar se:**
   - O registro completa sem erros
   - O login funciona imediatamente
   - O dashboard carrega corretamente
   - Não há erro 500 no console

---

## Checklist de Verificação

Após a correção, verifique:

- [ ] ✅ Novo usuário consegue se registrar sem erro 500
- [ ] ✅ Novo usuário é automaticamente direcionado ao dashboard
- [ ] ✅ Dashboard carrega com badge "Free" visível
- [ ] ✅ Limite de 3 monitores é exibido no card "Total de Monitors"
- [ ] ✅ Não há erro 500 no console ao carregar `/teams/:id/usage`
- [ ] ✅ Login funciona em outro dispositivo/navegador

---

## Logs para Diagnosticar Problemas

Se ainda houver problemas de autenticação:

1. **Verificar logs da API:**
   ```bash
   # Se rodando via npm
   cd apps/api && npm run dev

   # Se rodando via Docker
   docker logs -f observabilidade-api
   ```

2. **Verificar console do navegador:**
   - Pressione F12
   - Aba "Console" - procure por erros
   - Aba "Network" - veja requisições que falharam

3. **Testar endpoints manualmente:**
   ```bash
   # Testar registro
   curl -X POST http://localhost:3333/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"teste@teste.com","password":"senha123","name":"Teste"}'

   # Testar login
   curl -X POST http://localhost:3333/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"teste@teste.com","password":"senha123"}'
   ```

---

## Alterações Realizadas

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `apps/api/src/modules/auth/auth.service.ts` | Fix | Adicionada criação de subscription Free no registro |

---

**Data da Correção:** 2026-01-19
**Status:** ✅ Corrigido e pronto para testes
