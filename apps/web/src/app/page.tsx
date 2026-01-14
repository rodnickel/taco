'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/logo-taco.png" alt="Taco" className="h-8 w-8" />
              <span className="text-xl font-bold font-display text-orange-500">Taco</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#recursos" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Recursos
              </a>
              <a href="#monitoramento" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Monitoramento
              </a>
              <a href="#alertas" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Alertas
              </a>
              <a href="#status-pages" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Páginas de Status
              </a>
              <Link href="/pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Preços
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
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
              <a href="#recursos" className="block text-sm text-zinc-400 hover:text-white">Recursos</a>
              <a href="#monitoramento" className="block text-sm text-zinc-400 hover:text-white">Monitoramento</a>
              <a href="#alertas" className="block text-sm text-zinc-400 hover:text-white">Alertas</a>
              <a href="#status-pages" className="block text-sm text-zinc-400 hover:text-white">Páginas de Status</a>
              <Link href="/pricing" className="block text-sm text-zinc-400 hover:text-white">Preços</Link>
              <div className="pt-4 border-t border-zinc-800 flex flex-col gap-3">
                <Link href="/login" className="text-sm font-medium text-zinc-300 hover:text-white">
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-center"
                >
                  Criar Conta
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-orange-500/5 to-transparent rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-sm text-zinc-400">Monitoramento em tempo real</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight mb-6">
              <span className="text-white">Monitore seus serviços com</span>
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                inteligência e precisão
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
              Plataforma completa de observabilidade. Monitore uptime, receba alertas instantâneos
              e mantenha seus usuários informados com status pages profissionais.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-orange-500/25"
              >
                Comece Grátis
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#recursos"
                className="inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
              >
                Ver Recursos
              </a>
            </div>

            {/* Status Demo */}
            <div className="mt-16 flex flex-wrap gap-4 justify-center">
              <div className="badge-up px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                API Online
              </div>
              <div className="badge-up px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Website 99.9%
              </div>
              <div className="badge-degraded px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                CDN Degradado
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl">
              {/* Fake Browser Header */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center gap-2 bg-zinc-800 rounded-lg px-4 py-1.5 text-sm text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    app.taco.dev/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Stats */}
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-zinc-400 text-sm mb-1">Monitors</div>
                  <div className="text-2xl font-bold text-white">12</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-zinc-400 text-sm mb-1">Online</div>
                  <div className="text-2xl font-bold text-emerald-400">11</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-zinc-400 text-sm mb-1">Incidentes</div>
                  <div className="text-2xl font-bold text-amber-400">2</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-zinc-400 text-sm mb-1">Uptime</div>
                  <div className="text-2xl font-bold text-white">99.7%</div>
                </div>

                {/* Monitor List */}
                <div className="md:col-span-4 bg-zinc-800/50 rounded-xl p-4">
                  <div className="space-y-3">
                    {[
                      { name: 'API Principal', status: 'up', uptime: '99.99%' },
                      { name: 'Website', status: 'up', uptime: '99.95%' },
                      { name: 'CDN', status: 'degraded', uptime: '98.50%' },
                      { name: 'Database', status: 'up', uptime: '100%' },
                    ].map((monitor) => (
                      <div key={monitor.name} className="flex items-center justify-between py-2 px-3 bg-zinc-900/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${
                            monitor.status === 'up' ? 'bg-emerald-500' :
                            monitor.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
                          }`}></span>
                          <span className="text-white">{monitor.name}</span>
                        </div>
                        <span className="text-zinc-400 text-sm">{monitor.uptime}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos Section */}
      <section id="recursos" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
              Tudo que você precisa para <span className="text-orange-500">monitorar</span>
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Ferramentas poderosas para garantir a disponibilidade dos seus serviços
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 - Monitoring */}
            <div className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/50 transition-all">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition-colors">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Monitoramento HTTP</h3>
              <p className="text-zinc-400">
                Monitore endpoints HTTP/HTTPS com verificações configuráveis de intervalo, timeout e status codes esperados.
              </p>
            </div>

            {/* Feature 2 - SSL */}
            <div className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/50 transition-all">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Verificação SSL</h3>
              <p className="text-zinc-400">
                Monitore certificados SSL automaticamente. Receba alertas proativos antes da expiração.
              </p>
            </div>

            {/* Feature 3 - Alerts */}
            <div className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/50 transition-all">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-red-500/20 transition-colors">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Alertas Multi-canal</h3>
              <p className="text-zinc-400">
                Receba notificações por Email, WhatsApp, Telegram e Webhook. Configure políticas de escalonamento.
              </p>
            </div>

            {/* Feature 4 - Páginas de Status */}
            <div className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/50 transition-all">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Páginas de Status</h3>
              <p className="text-zinc-400">
                Crie páginas de status públicas personalizáveis. Mantenha seus usuários informados em tempo real.
              </p>
            </div>

            {/* Feature 5 - Groups */}
            <div className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/50 transition-all">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Grupos de Monitors</h3>
              <p className="text-zinc-400">
                Organize seus monitors em grupos lógicos. Visualize o status agregado por categoria de serviço.
              </p>
            </div>

            {/* Feature 6 - Incidents */}
            <div className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/50 transition-all">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Gestão de Incidentes</h3>
              <p className="text-zinc-400">
                Rastreie incidentes automaticamente. Reconheça, resolva e analise o histórico completo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Monitoramento Section */}
      <section id="monitoramento" className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold font-display mb-6">
                Monitoramento <span className="text-orange-500">24/7</span>
              </h2>
              <p className="text-lg text-zinc-400 mb-8">
                Verificações automáticas a cada minuto. Saiba imediatamente quando algo der errado.
              </p>

              <div className="space-y-4">
                {[
                  'Verificações HTTP/HTTPS configuráveis',
                  'Validação de códigos de status e corpo da resposta',
                  'Cabeçalhos customizados para autenticação',
                  'Histórico de disponibilidade de 90 dias',
                  'Métricas de latência e desempenho',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-zinc-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Uptime Bars Demo */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-semibold text-white">API Principal</h4>
                  <p className="text-sm text-zinc-400">api.exemplo.com</p>
                </div>
                <span className="badge-up px-3 py-1 rounded-full text-sm font-medium">Online</span>
              </div>

              {/* Uptime Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-zinc-400 mb-2">
                  <span>90 dias</span>
                  <span>99.95% disponibilidade</span>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 90 }).map((_, i) => {
                    const status = i === 45 ? 'degraded' : i === 67 || i === 68 ? 'down' : 'up'
                    return (
                      <div
                        key={i}
                        className={`flex-1 h-8 rounded-sm ${
                          status === 'up' ? 'bg-emerald-500' :
                          status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                <div>
                  <div className="text-sm text-zinc-400">Latência</div>
                  <div className="text-lg font-semibold text-white">45ms</div>
                </div>
                <div>
                  <div className="text-sm text-zinc-400">Última verificação</div>
                  <div className="text-lg font-semibold text-white">12s</div>
                </div>
                <div>
                  <div className="text-sm text-zinc-400">Incidentes</div>
                  <div className="text-lg font-semibold text-white">2</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Alertas Section */}
      <section id="alertas" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Alert Channels Demo */}
            <div className="order-2 lg:order-1 space-y-4">
              {/* WhatsApp */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">WhatsApp</div>
                  <div className="text-sm text-zinc-400">Alertas instantâneos no seu celular</div>
                </div>
                <div className="badge-up px-3 py-1 rounded-full text-xs">Ativo</div>
              </div>

              {/* Email */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">Email</div>
                  <div className="text-sm text-zinc-400">Relatórios e alertas detalhados</div>
                </div>
                <div className="badge-up px-3 py-1 rounded-full text-xs">Ativo</div>
              </div>

              {/* Telegram */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">Telegram</div>
                  <div className="text-sm text-zinc-400">Notificações em grupos ou privado</div>
                </div>
                <div className="badge-up px-3 py-1 rounded-full text-xs">Ativo</div>
              </div>

              {/* Webhook */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">Webhook</div>
                  <div className="text-sm text-zinc-400">Integre com qualquer sistema</div>
                </div>
                <div className="badge-unknown px-3 py-1 rounded-full text-xs">Configurar</div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="text-3xl sm:text-4xl font-bold font-display mb-6">
                Alertas onde você <span className="text-orange-500">precisa</span>
              </h2>
              <p className="text-lg text-zinc-400 mb-8">
                Receba notificações instantâneas nos canais que você já usa. Configure múltiplos canais e políticas de escalonamento.
              </p>

              <div className="space-y-4">
                {[
                  'WhatsApp, Email, Telegram e Webhook',
                  'Teste de notificação com um clique',
                  'Políticas de escalonamento configuráveis',
                  'Alertas proativos de SSL',
                  'Histórico completo de notificações',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-zinc-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Páginas de Status Section */}
      <section id="status-pages" className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
              Páginas de Status <span className="text-orange-500">Profissionais</span>
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Mantenha seus usuários informados com páginas de status públicas e personalizáveis
            </p>
          </div>

          {/* Status Page Demo */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">T</div>
                  <span className="font-semibold text-white">Status - Minha Empresa</span>
                </div>
              </div>

              {/* Status */}
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-lg font-semibold text-emerald-400">Todos os sistemas operacionais</span>
                </div>
                <p className="text-sm text-zinc-400">Atualizado há 2 minutos</p>
              </div>

              {/* Groups */}
              <div className="divide-y divide-zinc-800">
                {/* Group 1 */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-white">Infraestrutura</span>
                    <span className="text-sm text-emerald-400">Operacional</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 bg-zinc-800/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-sm text-zinc-300">API</span>
                      </div>
                      <span className="text-xs text-zinc-500">99.99%</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-zinc-800/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-sm text-zinc-300">Website</span>
                      </div>
                      <span className="text-xs text-zinc-500">100%</span>
                    </div>
                  </div>
                </div>

                {/* Group 2 */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-white">Serviços</span>
                    <span className="text-sm text-amber-400">Parcialmente degradado</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 bg-zinc-800/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-sm text-zinc-300">CDN</span>
                      </div>
                      <span className="text-xs text-zinc-500">98.5%</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-zinc-800/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-sm text-zinc-300">Storage</span>
                      </div>
                      <span className="text-xs text-zinc-500">100%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-zinc-800/30 px-6 py-4 text-center">
                <span className="text-sm text-zinc-500">Powered by </span>
                <span className="text-sm font-semibold text-orange-500">Taco</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold font-display mb-6">
            Comece a monitorar <span className="text-orange-500">agora</span>
          </h2>
          <p className="text-lg text-zinc-400 mb-10 max-w-2xl mx-auto">
            Configure seu primeiro monitor em menos de 2 minutos.
            Sem cartão de crédito necessário.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-orange-500/25"
            >
              Criar Conta Grátis
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo-taco.png" alt="Taco" className="h-8 w-8" />
              <span className="text-lg font-bold font-display text-orange-500">Taco</span>
            </div>

            <div className="flex items-center gap-8 text-sm text-zinc-400">
              <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
              <a href="#monitoramento" className="hover:text-white transition-colors">Monitoramento</a>
              <a href="#alertas" className="hover:text-white transition-colors">Alertas</a>
              <a href="#status-pages" className="hover:text-white transition-colors">Páginas de Status</a>
              <Link href="/pricing" className="hover:text-white transition-colors">Preços</Link>
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
