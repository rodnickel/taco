'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { ApiError } from '@/lib/api'

type ChannelType = 'email' | 'webhook' | 'slack'

export default function NewAlertChannelPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [type, setType] = useState<ChannelType>('email')

  // Email config
  const [emailTo, setEmailTo] = useState('')

  // Webhook config
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookMethod, setWebhookMethod] = useState<'POST' | 'GET'>('POST')

  // Slack config
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('')
  const [slackChannel, setSlackChannel] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let config: Record<string, string> = {}

      if (type === 'email') {
        config = { to: emailTo }
      } else if (type === 'webhook') {
        config = { url: webhookUrl, method: webhookMethod }
      } else if (type === 'slack') {
        config = { webhookUrl: slackWebhookUrl, channel: slackChannel }
      }

      await api.createAlertChannel({
        name,
        type,
        config,
      })

      router.push('/alerts')
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.details && apiError.details.length > 0) {
        setError(apiError.details.map((d) => d.message).join('. '))
      } else {
        setError(apiError.error || 'Erro ao criar canal de alerta')
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
        <h1 className="text-2xl font-bold text-white">Novo Canal de Alerta</h1>
        <p className="text-zinc-400 mt-1">Configure um novo canal para receber notificações</p>
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
              placeholder="Ex: Email Principal, Webhook PagerDuty"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              Tipo de Canal
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setType('email')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  type === 'email'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800'
                }`}
              >
                <svg className={`w-6 h-6 mx-auto mb-2 ${type === 'email' ? 'text-orange-400' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span className={`text-sm font-medium ${type === 'email' ? 'text-white' : 'text-zinc-400'}`}>Email</span>
              </button>

              <button
                type="button"
                onClick={() => setType('webhook')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  type === 'webhook'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800'
                }`}
              >
                <svg className={`w-6 h-6 mx-auto mb-2 ${type === 'webhook' ? 'text-orange-400' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                </svg>
                <span className={`text-sm font-medium ${type === 'webhook' ? 'text-white' : 'text-zinc-400'}`}>Webhook</span>
              </button>

              <button
                type="button"
                onClick={() => setType('slack')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  type === 'slack'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800'
                }`}
              >
                <svg className={`w-6 h-6 mx-auto mb-2 ${type === 'slack' ? 'text-orange-400' : 'text-zinc-400'}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
                <span className={`text-sm font-medium ${type === 'slack' ? 'text-white' : 'text-zinc-400'}`}>Slack</span>
              </button>
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
                placeholder="email@exemplo.com"
              />
              <p className="text-xs text-zinc-500 mt-2">Os alertas serão enviados para este endereço.</p>
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
                  placeholder="https://api.exemplo.com/webhook"
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
              <p className="text-xs text-zinc-500">Os dados do alerta serão enviados como JSON no corpo da requisição.</p>
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
                  placeholder="https://hooks.slack.com/services/..."
                />
                <p className="text-xs text-zinc-500 mt-2">
                  Crie um Incoming Webhook no Slack e cole a URL aqui.
                </p>
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
            disabled={loading}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Canal'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
