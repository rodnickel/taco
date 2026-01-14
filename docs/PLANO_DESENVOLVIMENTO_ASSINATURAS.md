# Plano de Desenvolvimento - Sistema de Assinaturas

Este documento detalha as tarefas necessárias para implementar o sistema de planos e limites no Taco.

---

## Resumo dos Planos

| Recurso | Free | Starter (R$29) | Pro (R$79) | Business (R$199) |
|---------|------|----------------|------------|------------------|
| Monitores | 3 | 10 | 50 | Ilimitado |
| Intervalo mínimo | 5 min | 3 min | 1 min | 30 seg |
| Histórico | 7 dias | 30 dias | 90 dias | 1 ano |
| Status Pages | 1 | 3 | 10 | Ilimitado |
| Membros do time | 1 | 3 | 10 | Ilimitado |
| Canais de alerta | Email | Email, Telegram, Webhook | + WhatsApp | + WhatsApp |
| Suporte | Comunidade | Email | Prioritário | Dedicado |

---

## Fase 1: Estrutura do Banco de Dados

### 1.1 Modelo de Plano (Plan)
- [ ] Criar modelo `Plan` no Prisma schema
  - id, name, slug (free, starter, pro, business)
  - price (em centavos)
  - maxMonitors, minIntervalSeconds, historyDays
  - maxStatusPages, maxTeamMembers
  - allowedChannels (array: email, telegram, webhook, whatsapp)
  - isActive, createdAt, updatedAt

### 1.2 Modelo de Assinatura (Subscription)
- [ ] Criar modelo `Subscription` no Prisma schema
  - id, teamId (relação com Team)
  - planId (relação com Plan)
  - status (active, canceled, past_due, trialing)
  - currentPeriodStart, currentPeriodEnd
  - cancelAtPeriodEnd
  - stripeCustomerId, stripeSubscriptionId (para integração futura)
  - createdAt, updatedAt

### 1.3 Atualizar modelo Team
- [ ] Adicionar relação com Subscription
- [ ] Campo `subscriptionId` opcional

### 1.4 Seed dos Planos
- [ ] Criar seed para popular os 4 planos no banco
- [ ] Executar migration e seed

---

## Fase 2: Backend - Serviço de Limites

### 2.1 Serviço de Planos (plans.service.ts)
- [ ] Criar módulo `plans` na API
- [ ] Função `getPlanBySlug(slug)`
- [ ] Função `getAllPlans()`
- [ ] Função `getTeamPlan(teamId)` - retorna plano atual do time

### 2.2 Serviço de Limites (limits.service.ts)
- [ ] Criar serviço de verificação de limites
- [ ] `checkMonitorLimit(teamId)` - verifica se pode criar mais monitores
- [ ] `checkStatusPageLimit(teamId)` - verifica se pode criar mais status pages
- [ ] `checkTeamMemberLimit(teamId)` - verifica se pode adicionar membros
- [ ] `getMinInterval(teamId)` - retorna intervalo mínimo permitido
- [ ] `getAllowedChannels(teamId)` - retorna canais de alerta permitidos
- [ ] `getHistoryDays(teamId)` - retorna dias de histórico

### 2.3 Endpoints de Planos
- [ ] GET `/api/plans` - lista todos os planos
- [ ] GET `/api/teams/:id/subscription` - retorna assinatura atual do time
- [ ] GET `/api/teams/:id/usage` - retorna uso atual vs limites

---

## Fase 3: Backend - Aplicar Limites

### 3.1 Monitores
- [ ] Validar limite de monitores ao criar (monitors.service.ts)
- [ ] Validar intervalo mínimo ao criar/editar monitor
- [ ] Retornar erro claro quando limite atingido

### 3.2 Status Pages
- [ ] Validar limite de status pages ao criar (status-pages.service.ts)
- [ ] Retornar erro claro quando limite atingido

### 3.3 Membros do Time
- [ ] Validar limite de membros ao convidar (teams.service.ts)
- [ ] Retornar erro claro quando limite atingido

### 3.4 Canais de Alerta
- [ ] Validar canal permitido ao criar alert channel (alerts.service.ts)
- [ ] Filtrar canais disponíveis baseado no plano
- [ ] Retornar erro claro quando canal não permitido

### 3.5 Histórico
- [ ] Aplicar filtro de data nas queries de checks/incidents
- [ ] Limitar dados retornados ao período do plano

---

## Fase 4: Frontend - Exibição de Limites

### 4.1 Dashboard
- [ ] Exibir uso atual (X de Y monitores, etc)
- [ ] Badge do plano atual
- [ ] Botão de upgrade quando próximo do limite

### 4.2 Criação de Recursos
- [ ] Mostrar aviso quando limite atingido
- [ ] Desabilitar botão de criar com mensagem de upgrade
- [ ] Mostrar intervalos disponíveis baseado no plano

### 4.3 Canais de Alerta
- [ ] Mostrar canais disponíveis vs bloqueados
- [ ] Badge "Pro" nos canais premium (WhatsApp)
- [ ] CTA de upgrade ao clicar em canal bloqueado

### 4.4 Página de Configurações do Time
- [ ] Seção "Plano Atual" com detalhes
- [ ] Uso atual de cada recurso (barra de progresso)
- [ ] Botão de gerenciar assinatura
- [ ] Histórico de faturas (futuro)

---

## Fase 5: Página de Upgrade

### 5.1 Página /upgrade
- [ ] Comparativo de planos (similar ao /pricing)
- [ ] Destacar plano atual
- [ ] Botões de upgrade/downgrade
- [ ] Calcular diferença de preço pro-rata (futuro)

### 5.2 Fluxo de Checkout (futuro - Stripe)
- [ ] Integração com Stripe Checkout
- [ ] Webhooks para atualizar status da assinatura
- [ ] Portal do cliente para gerenciar pagamento

---

## Fase 6: Assinatura Padrão

### 6.1 Auto-atribuição do Plano Free
- [ ] Ao criar time, criar subscription com plano Free automaticamente
- [ ] Garantir que todo time tenha uma subscription

### 6.2 Migration de Times Existentes
- [ ] Script para atribuir plano Free aos times existentes

---

## Fase 7: Testes

### 7.1 Testes de Limites
- [ ] Testar criação de monitor além do limite
- [ ] Testar intervalo mínimo por plano
- [ ] Testar canais bloqueados
- [ ] Testar histórico limitado

### 7.2 Testes de Upgrade/Downgrade
- [ ] Testar transição entre planos
- [ ] Verificar que recursos excedentes são mantidos (mas não podem criar novos)

---

## Notas de Implementação

### Comportamento ao Exceder Limites (Downgrade)
- Monitores existentes continuam funcionando
- Não pode criar novos monitores
- Intervalo dos monitores existentes NÃO é alterado
- Canais existentes continuam enviando alertas
- Histórico antigo permanece visível (somente leitura)

### Prioridade de Implementação
1. Fase 1 (Banco) + Fase 2 (Serviços) - Base necessária
2. Fase 3 (Aplicar Limites) - Core da funcionalidade
3. Fase 6 (Assinatura Padrão) - Todo time precisa de plano
4. Fase 4 (Frontend) - UX dos limites
5. Fase 5 (Upgrade) - Monetização
6. Fase 7 (Testes) - Qualidade

---

## Changelog

| Data | Fase | Item | Status |
|------|------|------|--------|
| | | | |

---

*Última atualização: Janeiro 2026*
