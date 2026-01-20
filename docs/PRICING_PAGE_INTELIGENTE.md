# Página de Pricing Inteligente

## Implementação

A página `/pricing` agora detecta quando o usuário está logado e mostra o plano atual de forma diferenciada.

## Funcionalidades

### 1. Detecção de Autenticação

A página verifica:
- Se existe token no localStorage
- Se existe currentTeam no localStorage
- Busca a assinatura atual do time via API

### 2. Diferenciação Visual do Plano Atual

Quando o usuário está logado e visualizando seu plano atual:

**Card do plano atual:**
- Aparece com opacidade reduzida (60%)
- Badge azul "Plano Atual" no topo
- Botão desabilitado mostrando "Plano Atual"
- Cursor não permitido no botão

**Outros planos:**
- Badge laranja "Mais popular" (se aplicável)
- Botão "Fazer Upgrade" (para usuários logados)
- Link direto para `/dashboard?upgrade={slug}`

### 3. Navegação Adaptativa

**Usuário NÃO logado:**
- Botões "Entrar" e "Criar Conta" no header
- CTAs levam para `/register` ou `/login`

**Usuário logado:**
- Botão "Dashboard" no header
- CTAs dos planos levam para `/dashboard?upgrade={slug}`
- Plano atual mostra botão desabilitado

## Estrutura de Dados

Cada plano possui:
```typescript
{
  name: string,        // Nome exibido
  slug: string,        // Identificador único ('free', 'starter', 'pro', 'business')
  price: string,       // Preço formatado
  period: string,      // Período de cobrança
  description: string, // Descrição curta
  popular: boolean,    // Se é o plano mais popular
  features: Array,     // Lista de features
  cta: string,         // Texto do botão (para não logados)
  ctaLink: string      // Link padrão (para não logados)
}
```

## Fluxo de Funcionamento

```
┌─────────────────────────────────────────┐
│ Usuário acessa /pricing                 │
└───────────────┬─────────────────────────┘
                │
                ├─ useEffect verifica localStorage
                │  - token existe?
                │  - currentTeam existe?
                │
                ├─ SIM: Busca assinatura via API
                │  └─ getTeamSubscription(teamId)
                │     └─ Armazena plan.slug
                │
                └─ NÃO: Mantém isLoggedIn = false
```

## Código Relevante

### Estado do Componente

```typescript
const [currentPlanSlug, setCurrentPlanSlug] = useState<string | null>(null)
const [isLoggedIn, setIsLoggedIn] = useState(false)
```

### Verificação de Autenticação

```typescript
useEffect(() => {
  async function checkAuth() {
    const token = localStorage.getItem('token')
    const currentTeamId = localStorage.getItem('currentTeam')

    if (token && currentTeamId) {
      setIsLoggedIn(true)
      try {
        const subscription = await getTeamSubscription(currentTeamId)
        setCurrentPlanSlug(subscription.plan.slug)
      } catch (error) {
        console.error('Erro ao buscar assinatura:', error)
      }
    }
  }
  checkAuth()
}, [])
```

### Renderização do Card

```typescript
const isCurrentPlan = isLoggedIn && currentPlanSlug === plan.slug

<div className={`... ${isCurrentPlan ? 'opacity-60' : ''}`}>
  {isCurrentPlan && (
    <span className="bg-blue-500 ...">Plano Atual</span>
  )}

  {isCurrentPlan ? (
    <button disabled>Plano Atual</button>
  ) : (
    <Link href={isLoggedIn ? `/dashboard?upgrade=${plan.slug}` : plan.ctaLink}>
      {isLoggedIn ? 'Fazer Upgrade' : plan.cta}
    </Link>
  )}
</div>
```

## Melhorias Futuras

1. **Comparação de Planos**: Mostrar diferenças visuais entre plano atual e upgrades
2. **Cálculo de Economia**: Exibir quanto o usuário economizaria/gastaria
3. **Trial Badge**: Mostrar se o usuário está em período de teste
4. **Downgrade**: Permitir downgrade com aviso de perda de recursos
5. **Ciclo Anual**: Opção de toggle mensal/anual com desconto
6. **Status da Assinatura**: Indicar se a assinatura está cancelada/suspensa

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `apps/web/src/app/pricing/page.tsx` | Adicionada lógica de detecção de plano atual e renderização condicional |

## Deploy

**Images atualizadas:**
- Web: `sha256:d9d0662b627d8b782e683720659c1f986c234850ed149339ed278328f98104bb`

**Como testar:**
1. Faça repull no Portainer para ambas as imagens
2. Acesse `/pricing` sem estar logado - deve mostrar botões normais
3. Faça login
4. Acesse `/pricing` novamente - deve mostrar plano atual diferenciado
5. Verifique que o botão do plano atual está desabilitado

---

**Data:** 2026-01-20
**Status:** ✅ Implementado e testado
