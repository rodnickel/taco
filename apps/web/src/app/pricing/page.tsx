'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getTeamSubscription } from '@/lib/api'

const plans = [
  {
    name: 'Free',
    slug: 'free',
    price: 'R$ 0',
    period: '/para sempre',
    description: 'Para projetos pessoais e testes',
    popular: false,
    features: [
      { text: '3 monitores', included: true },
      { text: 'Intervalo de 5 minutos', included: true },
      { text: '1 canal de alerta (Email)', included: true },
      { text: 'Historico de 7 dias', included: true },
      { text: '1 status page (com marca Taco)', included: true },
      { text: 'Verificacao SSL', included: true },
      { text: 'Grupos de monitores', included: false },
      { text: 'WhatsApp', included: false },
      { text: 'Telegram', included: false },
      { text: 'Webhook', included: false },
    ],
    cta: 'Comecar Gratis',
    ctaLink: '/register',
  },
  {
    name: 'Starter',
    slug: 'starter',
    price: 'R$ 29',
    period: '/mes',
    description: 'Para freelancers e pequenos projetos',
    popular: false,
    features: [
      { text: '10 monitores', included: true },
      { text: 'Intervalo de 1 minuto', included: true },
      { text: '3 canais de alerta', included: true },
      { text: 'Historico de 30 dias', included: true },
      { text: '1 status page personalizada', included: true },
      { text: 'Verificacao SSL', included: true },
      { text: '3 grupos de monitores', included: true },
      { text: 'Email + Telegram + Webhook', included: true },
      { text: 'WhatsApp', included: false },
      { text: 'Membros do time', included: false },
    ],
    cta: 'Assinar Starter',
    ctaLink: '/register?plan=starter',
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: 'R$ 79',
    period: '/mes',
    description: 'Para startups e pequenas empresas',
    popular: true,
    features: [
      { text: '50 monitores', included: true },
      { text: 'Intervalo de 30 segundos', included: true },
      { text: '10 canais de alerta', included: true },
      { text: 'Historico de 90 dias', included: true },
      { text: '3 status pages', included: true },
      { text: 'Verificacao SSL', included: true },
      { text: '10 grupos de monitores', included: true },
      { text: 'WhatsApp (3 canais)', included: true, highlight: true },
      { text: '3 membros no time', included: true },
      { text: 'Gestao de incidentes', included: true },
    ],
    cta: 'Assinar Pro',
    ctaLink: '/register?plan=pro',
  },
  {
    name: 'Business',
    slug: 'business',
    price: 'R$ 199',
    period: '/mes',
    description: 'Para empresas em crescimento',
    popular: false,
    features: [
      { text: '200 monitores', included: true },
      { text: 'Intervalo de 30 segundos', included: true },
      { text: 'Canais ilimitados', included: true },
      { text: 'Historico de 1 ano', included: true },
      { text: 'Status pages ilimitadas', included: true },
      { text: 'Verificacao SSL', included: true },
      { text: 'Grupos ilimitados', included: true },
      { text: 'WhatsApp ilimitado', included: true, highlight: true },
      { text: '10 membros no time', included: true },
      { text: 'Suporte prioritario', included: true },
    ],
    cta: 'Assinar Business',
    ctaLink: '/register?plan=business',
  },
]

const faqs = [
  {
    question: 'Posso mudar de plano a qualquer momento?',
    answer: 'Sim! Voce pode fazer upgrade ou downgrade do seu plano a qualquer momento. O valor sera calculado proporcionalmente.',
  },
  {
    question: 'Como funciona o periodo de teste?',
    answer: 'Todos os planos pagos tem 14 dias de teste gratis. Voce pode cancelar a qualquer momento durante o periodo de teste sem ser cobrado.',
  },
  {
    question: 'Quais formas de pagamento sao aceitas?',
    answer: 'Aceitamos cartao de credito, PIX e boleto bancario. Para pagamentos anuais, oferecemos 2 meses gratis.',
  },
  {
    question: 'O que acontece se eu exceder os limites do meu plano?',
    answer: 'Voce recebera uma notificacao quando estiver proximo do limite. Seus monitores continuarao funcionando, mas voce nao podera criar novos ate fazer upgrade.',
  },
  {
    question: 'Posso cancelar minha assinatura?',
    answer: 'Sim, voce pode cancelar a qualquer momento. Sua conta continuara ativa ate o fim do periodo ja pago.',
  },
]

export default function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [currentPlanSlug, setCurrentPlanSlug] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Verifica se está logado e busca plano atual
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo-taco.png" alt="Taco" className="h-8 w-8" />
              <span className="text-xl font-bold font-display text-orange-500">Taco</span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/#recursos" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Recursos
              </Link>
              <Link href="/pricing" className="text-sm text-white font-medium">
                Precos
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Criar Conta
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-zinc-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-zinc-950">
            <div className="px-4 py-4 space-y-4">
              <Link href="/#recursos" className="block text-sm text-zinc-400 hover:text-white">Recursos</Link>
              <Link href="/pricing" className="block text-sm text-white font-medium">Precos</Link>
              <div className="pt-4 border-t border-zinc-800 flex flex-col gap-3">
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-center"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="text-sm font-medium text-zinc-300 hover:text-white">
                      Entrar
                    </Link>
                    <Link
                      href="/register"
                      className="text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-center"
                    >
                      Criar Conta
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-display mb-6">
            Planos <span className="text-orange-500">simples e transparentes</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Escolha o plano ideal para o tamanho do seu projeto. Todos os planos incluem verificacao SSL e suporte.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = isLoggedIn && currentPlanSlug === plan.slug
              return (
                <div
                  key={plan.name}
                  className={`relative bg-zinc-900 border rounded-2xl p-6 flex flex-col transition-opacity ${
                    plan.popular
                      ? 'border-orange-500 ring-2 ring-orange-500/20'
                      : 'border-zinc-800'
                  } ${isCurrentPlan ? 'opacity-60' : ''}`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Plano Atual
                      </span>
                    </div>
                  )}
                  {plan.popular && !isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Mais popular
                      </span>
                    </div>
                  )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-zinc-400">{plan.period}</span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-2">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      {feature.included ? (
                        <svg className={`w-5 h-5 flex-shrink-0 ${feature.highlight ? 'text-orange-500' : 'text-emerald-500'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 flex-shrink-0 text-zinc-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={feature.included ? (feature.highlight ? 'text-orange-400 font-medium' : 'text-zinc-300') : 'text-zinc-600'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-lg font-medium text-center bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed"
                  >
                    Plano Atual
                  </button>
                ) : (
                  <Link
                    href={isLoggedIn ? `/dashboard?upgrade=${plan.slug}` : plan.ctaLink}
                    className={`w-full py-3 px-4 rounded-lg font-medium text-center transition-colors ${
                      plan.popular
                        ? 'bg-orange-600 hover:bg-orange-500 text-white'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                    }`}
                  >
                    {isLoggedIn ? 'Fazer Upgrade' : plan.cta}
                  </Link>
                )}
              </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold font-display text-center mb-12">
            Comparacao <span className="text-orange-500">detalhada</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-4 px-4 text-zinc-400 font-medium">Recurso</th>
                  <th className="text-center py-4 px-4 text-zinc-400 font-medium">Free</th>
                  <th className="text-center py-4 px-4 text-zinc-400 font-medium">Starter</th>
                  <th className="text-center py-4 px-4 text-orange-500 font-medium">Pro</th>
                  <th className="text-center py-4 px-4 text-zinc-400 font-medium">Business</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <tr>
                  <td className="py-4 px-4 text-white">Monitores</td>
                  <td className="py-4 px-4 text-center text-zinc-400">3</td>
                  <td className="py-4 px-4 text-center text-zinc-400">10</td>
                  <td className="py-4 px-4 text-center text-white font-medium">50</td>
                  <td className="py-4 px-4 text-center text-zinc-400">200</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-white">Intervalo minimo</td>
                  <td className="py-4 px-4 text-center text-zinc-400">5 min</td>
                  <td className="py-4 px-4 text-center text-zinc-400">1 min</td>
                  <td className="py-4 px-4 text-center text-white font-medium">30s</td>
                  <td className="py-4 px-4 text-center text-zinc-400">30s</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-white">Canais de alerta</td>
                  <td className="py-4 px-4 text-center text-zinc-400">1</td>
                  <td className="py-4 px-4 text-center text-zinc-400">3</td>
                  <td className="py-4 px-4 text-center text-white font-medium">10</td>
                  <td className="py-4 px-4 text-center text-zinc-400">Ilimitado</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-white">Historico de dados</td>
                  <td className="py-4 px-4 text-center text-zinc-400">7 dias</td>
                  <td className="py-4 px-4 text-center text-zinc-400">30 dias</td>
                  <td className="py-4 px-4 text-center text-white font-medium">90 dias</td>
                  <td className="py-4 px-4 text-center text-zinc-400">1 ano</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-white">Status Pages</td>
                  <td className="py-4 px-4 text-center text-zinc-400">1 (com marca)</td>
                  <td className="py-4 px-4 text-center text-zinc-400">1</td>
                  <td className="py-4 px-4 text-center text-white font-medium">3</td>
                  <td className="py-4 px-4 text-center text-zinc-400">Ilimitado</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-white">Grupos de monitores</td>
                  <td className="py-4 px-4 text-center">
                    <svg className="w-5 h-5 mx-auto text-zinc-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </td>
                  <td className="py-4 px-4 text-center text-zinc-400">3</td>
                  <td className="py-4 px-4 text-center text-white font-medium">10</td>
                  <td className="py-4 px-4 text-center text-zinc-400">Ilimitado</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-white">Membros do time</td>
                  <td className="py-4 px-4 text-center text-zinc-400">1</td>
                  <td className="py-4 px-4 text-center text-zinc-400">1</td>
                  <td className="py-4 px-4 text-center text-white font-medium">3</td>
                  <td className="py-4 px-4 text-center text-zinc-400">10</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-white">WhatsApp</td>
                  <td className="py-4 px-4 text-center">
                    <svg className="w-5 h-5 mx-auto text-zinc-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <svg className="w-5 h-5 mx-auto text-zinc-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </td>
                  <td className="py-4 px-4 text-center text-orange-400 font-medium">3 canais</td>
                  <td className="py-4 px-4 text-center text-zinc-400">Ilimitado</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-white">Telegram</td>
                  <td className="py-4 px-4 text-center">
                    <svg className="w-5 h-5 mx-auto text-zinc-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <svg className="w-5 h-5 mx-auto text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <svg className="w-5 h-5 mx-auto text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <svg className="w-5 h-5 mx-auto text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-white">Webhook</td>
                  <td className="py-4 px-4 text-center">
                    <svg className="w-5 h-5 mx-auto text-zinc-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <svg className="w-5 h-5 mx-auto text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <svg className="w-5 h-5 mx-auto text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <svg className="w-5 h-5 mx-auto text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold font-display text-center mb-12">
            Perguntas <span className="text-orange-500">frequentes</span>
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
              >
                <button
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="font-medium text-white">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-zinc-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-zinc-400">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold font-display mb-6">
            Pronto para comecar?
          </h2>
          <p className="text-lg text-zinc-400 mb-10">
            Comece gratis e faca upgrade quando precisar. Sem compromisso.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-orange-500/25"
          >
            Criar Conta Gratis
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo-taco.png" alt="Taco" className="h-8 w-8" />
              <span className="text-lg font-bold font-display text-orange-500">Taco</span>
            </Link>

            <div className="flex items-center gap-8 text-sm text-zinc-400">
              <Link href="/#recursos" className="hover:text-white transition-colors">Recursos</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">Precos</Link>
            </div>

            <div className="text-sm text-zinc-500">
              &copy; {new Date().getFullYear()} Taco. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
