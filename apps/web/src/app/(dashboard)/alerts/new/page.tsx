'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { ApiError } from '@/lib/api'
import { useTeam } from '@/contexts/TeamContext'

type ChannelType = 'email' | 'webhook' | 'slack' | 'whatsapp' | 'telegram'

// Mapeamento de canais para verificação
const channelTypeToAllowed: Record<ChannelType, string> = {
  email: 'email',
  webhook: 'webhook',
  slack: 'webhook', // Slack usa webhook
  whatsapp: 'whatsapp',
  telegram: 'telegram',
}

export default function NewAlertChannelPage() {
  const router = useRouter()
  const { usage } = useTeam()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Verifica se um canal está disponível no plano
  const isChannelAllowed = (channel: ChannelType): boolean => {
    if (!usage) return true // Se não carregou ainda, permite tudo
    const allowedKey = channelTypeToAllowed[channel]
    return usage.limits.allowedChannels.includes(allowedKey)
  }

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

  // WhatsApp config
  const [whatsappPhone, setWhatsappPhone] = useState('')

  // Telegram config
  const [telegramChatId, setTelegramChatId] = useState('')
  const [telegramBotToken, setTelegramBotToken] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let config: Record<string, string> = {}

      if (type === 'email') {
        config = { email: emailTo }
      } else if (type === 'webhook') {
        config = { url: webhookUrl, method: webhookMethod }
      } else if (type === 'slack') {
        config = { webhookUrl: slackWebhookUrl, channel: slackChannel }
      } else if (type === 'whatsapp') {
        config = { phone: whatsappPhone }
      } else if (type === 'telegram') {
        config = {
          chatId: telegramChatId,
          ...(telegramBotToken && { botToken: telegramBotToken }),
        }
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
              placeholder="Ex: Email Principal, WhatsApp Equipe"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              Tipo de Canal
            </label>
            <div className="grid grid-cols-5 gap-3">
              {/* Email - sempre disponível */}
              <button
                type="button"
                onClick={() => isChannelAllowed('email') && setType('email')}
                disabled={!isChannelAllowed('email')}
                className={`p-4 rounded-lg border-2 transition-colors relative ${
                  type === 'email'
                    ? 'border-orange-500 bg-orange-500/10'
                    : isChannelAllowed('email')
                    ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800'
                    : 'border-zinc-800 bg-zinc-900 opacity-50 cursor-not-allowed'
                }`}
              >
                <svg className={`w-6 h-6 mx-auto mb-2 ${type === 'email' ? 'text-orange-400' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span className={`text-xs font-medium ${type === 'email' ? 'text-white' : 'text-zinc-400'}`}>Email</span>
              </button>

              {/* WhatsApp - Pro/Business */}
              <button
                type="button"
                onClick={() => isChannelAllowed('whatsapp') && setType('whatsapp')}
                disabled={!isChannelAllowed('whatsapp')}
                className={`p-4 rounded-lg border-2 transition-colors relative ${
                  type === 'whatsapp'
                    ? 'border-orange-500 bg-orange-500/10'
                    : isChannelAllowed('whatsapp')
                    ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800'
                    : 'border-zinc-800 bg-zinc-900 opacity-50 cursor-not-allowed'
                }`}
              >
                {!isChannelAllowed('whatsapp') && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-bold bg-purple-500 text-white rounded">PRO</span>
                )}
                <svg className={`w-6 h-6 mx-auto mb-2 ${type === 'whatsapp' ? 'text-orange-400' : 'text-zinc-400'}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className={`text-xs font-medium ${type === 'whatsapp' ? 'text-white' : 'text-zinc-400'}`}>WhatsApp</span>
              </button>

              {/* Telegram - Starter+ */}
              <button
                type="button"
                onClick={() => isChannelAllowed('telegram') && setType('telegram')}
                disabled={!isChannelAllowed('telegram')}
                className={`p-4 rounded-lg border-2 transition-colors relative ${
                  type === 'telegram'
                    ? 'border-orange-500 bg-orange-500/10'
                    : isChannelAllowed('telegram')
                    ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800'
                    : 'border-zinc-800 bg-zinc-900 opacity-50 cursor-not-allowed'
                }`}
              >
                {!isChannelAllowed('telegram') && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded">STARTER</span>
                )}
                <svg className={`w-6 h-6 mx-auto mb-2 ${type === 'telegram' ? 'text-orange-400' : 'text-zinc-400'}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span className={`text-xs font-medium ${type === 'telegram' ? 'text-white' : 'text-zinc-400'}`}>Telegram</span>
              </button>

              {/* Slack - Webhook, Starter+ */}
              <button
                type="button"
                onClick={() => isChannelAllowed('slack') && setType('slack')}
                disabled={!isChannelAllowed('slack')}
                className={`p-4 rounded-lg border-2 transition-colors relative ${
                  type === 'slack'
                    ? 'border-orange-500 bg-orange-500/10'
                    : isChannelAllowed('slack')
                    ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800'
                    : 'border-zinc-800 bg-zinc-900 opacity-50 cursor-not-allowed'
                }`}
              >
                {!isChannelAllowed('slack') && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded">STARTER</span>
                )}
                <svg className={`w-6 h-6 mx-auto mb-2 ${type === 'slack' ? 'text-orange-400' : 'text-zinc-400'}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
                <span className={`text-xs font-medium ${type === 'slack' ? 'text-white' : 'text-zinc-400'}`}>Slack</span>
              </button>

              {/* Webhook - Starter+ */}
              <button
                type="button"
                onClick={() => isChannelAllowed('webhook') && setType('webhook')}
                disabled={!isChannelAllowed('webhook')}
                className={`p-4 rounded-lg border-2 transition-colors relative ${
                  type === 'webhook'
                    ? 'border-orange-500 bg-orange-500/10'
                    : isChannelAllowed('webhook')
                    ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800'
                    : 'border-zinc-800 bg-zinc-900 opacity-50 cursor-not-allowed'
                }`}
              >
                {!isChannelAllowed('webhook') && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded">STARTER</span>
                )}
                <svg className={`w-6 h-6 mx-auto mb-2 ${type === 'webhook' ? 'text-orange-400' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                </svg>
                <span className={`text-xs font-medium ${type === 'webhook' ? 'text-white' : 'text-zinc-400'}`}>Webhook</span>
              </button>
            </div>

            {/* Aviso para upgrade se selecionou canal não disponível */}
            {!isChannelAllowed(type) && (
              <div className="mt-4 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                  </svg>
                  <div>
                    <p className="text-sm text-purple-400">
                      Este canal está disponível a partir do plano {type === 'whatsapp' ? 'Pro' : 'Starter'}.
                    </p>
                    <Link href="/pricing" className="text-sm text-purple-300 hover:text-purple-200 font-medium">
                      Fazer upgrade →
                    </Link>
                  </div>
                </div>
              </div>
            )}
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

          {/* WhatsApp config */}
          {type === 'whatsapp' && (
            <div>
              <label htmlFor="whatsappPhone" className="block text-sm font-medium text-zinc-300 mb-2">
                Número do WhatsApp
              </label>
              <input
                id="whatsappPhone"
                type="text"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                placeholder="5511999999999"
              />
              <p className="text-xs text-zinc-500 mt-2">Número com código do país (ex: 5511999999999)</p>
            </div>
          )}

          {/* Telegram config */}
          {type === 'telegram' && (
            <>
              <div>
                <label htmlFor="telegramChatId" className="block text-sm font-medium text-zinc-300 mb-2">
                  Chat ID
                </label>
                <input
                  id="telegramChatId"
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  placeholder="-1001234567890"
                />
                <p className="text-xs text-zinc-500 mt-2">ID do chat, grupo ou canal para enviar os alertas. Use @userinfobot para descobrir seu ID.</p>
              </div>
              <div>
                <label htmlFor="telegramBotToken" className="block text-sm font-medium text-zinc-300 mb-2">
                  Bot Token (opcional)
                </label>
                <input
                  id="telegramBotToken"
                  type="password"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  placeholder="••••••••••••••••"
                />
                <p className="text-xs text-zinc-500 mt-2">Deixe em branco para usar o bot padrão do servidor. Crie um bot com @BotFather.</p>
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
            disabled={loading || !isChannelAllowed(type)}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criando...
              </>
            ) : !isChannelAllowed(type) ? (
              'Canal não disponível'
            ) : (
              'Criar Canal'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
