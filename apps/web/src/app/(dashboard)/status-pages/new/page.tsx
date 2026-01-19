'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { ApiError, Monitor } from '@/lib/api'
import { useTeam } from '@/contexts/TeamContext'

export default function NewStatusPagePage() {
  const router = useRouter()
  const { usage, loading: usageLoading } = useTeam()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loadingMonitors, setLoadingMonitors] = useState(true)

  // Verifica se atingiu o limite de status pages
  const limitReached = usage && !usage.usage.statusPages.unlimited &&
    usage.usage.statusPages.current >= usage.usage.statusPages.limit

  // Form fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [primaryColor, setPrimaryColor] = useState('#10b981')
  const [backgroundColor, setBackgroundColor] = useState('#09090b')
  const [showUptime, setShowUptime] = useState(true)
  const [showLatency, setShowLatency] = useState(true)
  const [showHistory, setShowHistory] = useState(true)
  const [historyDays, setHistoryDays] = useState(90)
  const [selectedMonitors, setSelectedMonitors] = useState<string[]>([])

  useEffect(() => {
    loadMonitors()
  }, [])

  async function loadMonitors() {
    try {
      const response = await api.getMonitors()
      setMonitors(response.monitors)
    } catch (err) {
      console.error('Erro ao carregar monitors:', err)
    } finally {
      setLoadingMonitors(false)
    }
  }

  // Auto-generate slug from name
  useEffect(() => {
    if (name) {
      const generatedSlug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setSlug(generatedSlug)
    }
  }, [name])

  // Check slug availability
  const checkSlug = useCallback(async (slugToCheck: string) => {
    if (!slugToCheck || slugToCheck.length < 3) {
      setSlugError('')
      return
    }

    try {
      const result = await api.checkSlugAvailable(slugToCheck)
      if (!result.available) {
        setSlugError('Este slug já está em uso')
      } else {
        setSlugError('')
      }
    } catch {
      // Ignore errors
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      checkSlug(slug)
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [slug, checkSlug])

  function handleMonitorToggle(monitorId: string) {
    setSelectedMonitors((prev) =>
      prev.includes(monitorId)
        ? prev.filter((id) => id !== monitorId)
        : [...prev, monitorId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (slugError) {
      setError('Por favor, escolha um slug disponível')
      return
    }

    setLoading(true)

    try {
      await api.createStatusPage({
        name,
        slug,
        description: description || undefined,
        isPublic,
        primaryColor,
        backgroundColor,
        showUptime,
        showLatency,
        showHistory,
        historyDays,
        monitorIds: selectedMonitors,
      })

      router.push('/status-pages')
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.details && apiError.details.length > 0) {
        setError(apiError.details.map((d) => d.message).join('. '))
      } else {
        setError(apiError.error || 'Erro ao criar página de status')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/status-pages"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Status Pages
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Nova Status Page</h1>
        <p className="text-zinc-400 mt-1">Crie uma página pública de status para seus serviços</p>
      </div>

      {/* Limite atingido */}
      {limitReached && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-amber-400 font-medium">Limite de status pages atingido</h3>
              <p className="text-amber-400/80 text-sm mt-1">
                Você atingiu o limite de {usage?.usage.statusPages.limit} status page{usage?.usage.statusPages.limit !== 1 ? 's' : ''} do plano {usage?.plan.name}.
                Faça upgrade para criar mais páginas.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 mt-3 text-sm text-amber-400 hover:text-amber-300 font-medium"
              >
                Ver planos
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Informações básicas</h2>

          {/* Nome */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
              Nome da página
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="Status do Meu Serviço"
            />
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-zinc-300 mb-2">
              Slug (URL)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">/status/</span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
                minLength={3}
                maxLength={50}
                className={`flex-1 px-4 py-2.5 bg-zinc-800 border rounded-lg text-white placeholder-zinc-500 focus:outline-none transition-colors ${
                  slugError
                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-zinc-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
                }`}
                placeholder="meu-servico"
              />
            </div>
            {slugError && (
              <p className="text-xs text-red-400 mt-1">{slugError}</p>
            )}
            <p className="text-xs text-zinc-500 mt-1">
              Apenas letras minúsculas, números e hífens
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors resize-none"
              placeholder="Uma breve descrição da sua página de status"
            />
          </div>

          {/* Is Public */}
          <div className="flex items-center gap-3">
            <input
              id="isPublic"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
            />
            <label htmlFor="isPublic" className="text-sm text-zinc-300">
              Página pública (visível sem autenticação)
            </label>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Aparência</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Primary Color */}
            <div>
              <label htmlFor="primaryColor" className="block text-sm font-medium text-zinc-300 mb-2">
                Cor primária
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label htmlFor="backgroundColor" className="block text-sm font-medium text-zinc-300 mb-2">
                Cor de fundo
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="backgroundColor"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Configurações de exibição</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                id="showUptime"
                type="checkbox"
                checked={showUptime}
                onChange={(e) => setShowUptime(e.target.checked)}
                className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
              />
              <label htmlFor="showUptime" className="text-sm text-zinc-300">
                Mostrar porcentagem de uptime
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="showLatency"
                type="checkbox"
                checked={showLatency}
                onChange={(e) => setShowLatency(e.target.checked)}
                className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
              />
              <label htmlFor="showLatency" className="text-sm text-zinc-300">
                Mostrar latência
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="showHistory"
                type="checkbox"
                checked={showHistory}
                onChange={(e) => setShowHistory(e.target.checked)}
                className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
              />
              <label htmlFor="showHistory" className="text-sm text-zinc-300">
                Mostrar histórico de uptime
              </label>
            </div>
          </div>

          {showHistory && (
            <div>
              <label htmlFor="historyDays" className="block text-sm font-medium text-zinc-300 mb-2">
                Dias de histórico
              </label>
              <input
                id="historyDays"
                type="number"
                value={historyDays}
                onChange={(e) => setHistoryDays(Number(e.target.value))}
                min={7}
                max={365}
                className="w-32 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
              <p className="text-xs text-zinc-500 mt-1">Entre 7 e 365 dias</p>
            </div>
          )}
        </div>

        {/* Monitors Selection */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Monitors</h2>
          <p className="text-sm text-zinc-400">Selecione os monitors que serão exibidos na página de status</p>

          {loadingMonitors ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : monitors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-400 mb-4">Nenhum monitor encontrado</p>
              <Link
                href="/monitors/new"
                className="text-orange-400 hover:text-orange-300 text-sm"
              >
                Criar primeiro monitor
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {monitors.map((monitor) => (
                <label
                  key={monitor.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedMonitors.includes(monitor.id)
                      ? 'bg-orange-500/10 border border-orange-500/30'
                      : 'bg-zinc-800 border border-transparent hover:border-zinc-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedMonitors.includes(monitor.id)}
                    onChange={() => handleMonitorToggle(monitor.id)}
                    className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">{monitor.name}</p>
                    <p className="text-xs text-zinc-500">{monitor.url}</p>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      monitor.currentStatus === 'up'
                        ? 'bg-orange-500'
                        : monitor.currentStatus === 'down'
                        ? 'bg-red-500'
                        : 'bg-zinc-500'
                    }`}
                  />
                </label>
              ))}
            </div>
          )}

          {selectedMonitors.length > 0 && (
            <p className="text-sm text-zinc-400">
              {selectedMonitors.length} monitor{selectedMonitors.length > 1 ? 's' : ''} selecionado{selectedMonitors.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/status-pages"
            className="px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || !!slugError || limitReached}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criando...
              </>
            ) : limitReached ? (
              'Limite atingido'
            ) : (
              'Criar Status Page'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
