'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { ApiError, AlertChannel } from '@/lib/api'

export default function EditAlertChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [type, setType] = useState<AlertChannel['type']>('email')
  const [active, setActive] = useState(true)

  // Email config
  const [emailTo, setEmailTo] = useState('')

  // Webhook config
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookMethod, setWebhookMethod] = useState<'POST' | 'GET'>('POST')

  // Slack config
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('')
  const [slackChannel, setSlackChannel] = useState('')

  useEffect(() => {
    loadChannel()
  }, [id])

  async function loadChannel() {
    try {
      const channel = await api.getAlertChannel(id)
      setName(channel.name)
      setType(channel.type)
      setActive(channel.active)

      if (channel.type === 'email') {
        setEmailTo((channel.config as { to: string }).to || '')
      } else if (channel.type === 'webhook') {
        const config = channel.config as { url: string; method?: string }
        setWebhookUrl(config.url || '')
        setWebhookMethod((config.method as 'POST' | 'GET') || 'POST')
      } else if (channel.type === 'slack') {
        const config = channel.config as { webhookUrl: string; channel?: string }
        setSlackWebhookUrl(config.webhookUrl || '')
        setSlackChannel(config.channel || '')
      }
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === 'UNAUTHORIZED') {
        router.push('/login')
        return
      }
      setError(apiError.error || 'Erro ao carregar canal')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      let config: Record<string, string> = {}

      if (type === 'email') {
        config = { to: emailTo }
      } else if (type === 'webhook') {
        config = { url: webhookUrl, method: webhookMethod }
      } else if (type === 'slack') {
        config = { webhookUrl: slackWebhookUrl, channel: slackChannel }
      }

      await api.updateAlertChannel(id, {
        name,
        config,
        active,
      })

      router.push('/alerts')
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.details && apiError.details.length > 0) {
        setError(apiError.details.map((d) => d.message).join('. '))
      } else {
        setError(apiError.error || 'Erro ao atualizar canal')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400">Carregando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/alerts"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Canais de Alerta
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Editar Canal de Alerta</h1>
        <p className="text-zinc-400 mt-1">Atualize as configurações do canal</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          {/* Nome */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
              Nome do Canal
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            />
          </div>

          {/* Tipo (read-only) */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Tipo de Canal
            </label>
            <div className="px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-400">
              {type === 'email' && 'Email'}
              {type === 'webhook' && 'Webhook'}
              {type === 'slack' && 'Slack'}
              <span className="text-xs text-zinc-500 ml-2">(não pode ser alterado)</span>
            </div>
          </div>

          {/* Email config */}
          {type === 'email' && (
            <div>
              <label htmlFor="emailTo" className="block text-sm font-medium text-zinc-300 mb-2">
                Endereço de Email
              </label>
              <input
                id="emailTo"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
            </div>
          )}

          {/* Webhook config */}
          {type === 'webhook' && (
            <>
              <div>
                <label htmlFor="webhookUrl" className="block text-sm font-medium text-zinc-300 mb-2">
                  URL do Webhook
                </label>
                <input
                  id="webhookUrl"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="webhookMethod" className="block text-sm font-medium text-zinc-300 mb-2">
                  Método HTTP
                </label>
                <select
                  id="webhookMethod"
                  value={webhookMethod}
                  onChange={(e) => setWebhookMethod(e.target.value as 'POST' | 'GET')}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
              </div>
            </>
          )}

          {/* Slack config */}
          {type === 'slack' && (
            <>
              <div>
                <label htmlFor="slackWebhookUrl" className="block text-sm font-medium text-zinc-300 mb-2">
                  Slack Webhook URL
                </label>
                <input
                  id="slackWebhookUrl"
                  type="url"
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="slackChannel" className="block text-sm font-medium text-zinc-300 mb-2">
                  Canal (opcional)
                </label>
                <input
                  id="slackChannel"
                  type="text"
                  value={slackChannel}
                  onChange={(e) => setSlackChannel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  placeholder="#alerts"
                />
              </div>
            </>
          )}

          {/* Active */}
          <div className="flex items-center gap-3">
            <input
              id="active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
            />
            <label htmlFor="active" className="text-sm text-zinc-300">
              Canal ativo
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/alerts"
            className="px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
