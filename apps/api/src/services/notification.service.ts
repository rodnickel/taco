import { Resend } from 'resend'
import { env } from '../config/env.js'
import type {
  EmailConfig,
  WebhookConfig,
  SlackConfig,
  WhatsAppConfig,
  TelegramConfig,
} from '../modules/alerts/alerts.schema.js'

// ============================================
// Serviço de Notificações
// ============================================

// Resend só é inicializado se a API key estiver configurada
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

interface NotificationPayload {
  monitorName: string
  monitorUrl: string
  status: 'up' | 'down' | 'degraded'
  message: string
  checkedAt: Date
  latency?: number
}

// Envia email via Resend
export async function sendEmailNotification(
  config: EmailConfig,
  payload: NotificationPayload
): Promise<boolean> {
  const statusEmoji = payload.status === 'up' ? '✅' : payload.status === 'down' ? '🔴' : '⚠️'
  const statusText = payload.status === 'up' ? 'Online' : payload.status === 'down' ? 'Offline' : 'Degradado'

  if (!resend) {
    console.warn('⚠️ RESEND_API_KEY não configurada, email não enviado')
    return false
  }

  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: config.email,
      subject: `${statusEmoji} [${statusText}] ${payload.monitorName}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${payload.status === 'up' ? '#10b981' : payload.status === 'down' ? '#ef4444' : '#f59e0b'};">
            ${statusEmoji} Monitor ${statusText}
          </h2>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Monitor</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${payload.monitorName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">URL</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                <a href="${payload.monitorUrl}" style="color: #3b82f6;">${payload.monitorUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Status</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${statusText}</td>
            </tr>
            ${payload.latency ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Latência</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${payload.latency}ms</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Verificado em</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${payload.checkedAt.toLocaleString('pt-BR')}</td>
            </tr>
            ${payload.message ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Mensagem</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${payload.message}</td>
            </tr>
            ` : ''}
          </table>

          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
            Enviado por Observabilidade IT
          </p>
        </div>
      `,
    })

    console.log(`📧 Email enviado para ${config.email}`)
    return true
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    return false
  }
}

// Envia webhook
export async function sendWebhookNotification(
  config: WebhookConfig,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const body = JSON.stringify({
      type: 'alert',
      monitorName: payload.monitorName,
      monitorUrl: payload.monitorUrl,
      status: payload.status,
      message: payload.message,
      latency: payload.latency,
      checkedAt: payload.checkedAt.toISOString(),
    })

    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: config.method === 'GET' ? undefined : body,
    })

    if (!response.ok) {
      console.error(`Webhook retornou status ${response.status}`)
      return false
    }

    console.log(`🔗 Webhook enviado para ${config.url}`)
    return true
  } catch (error) {
    console.error('Erro ao enviar webhook:', error)
    return false
  }
}

// Envia para Slack
export async function sendSlackNotification(
  config: SlackConfig,
  payload: NotificationPayload
): Promise<boolean> {
  const statusEmoji = payload.status === 'up' ? ':white_check_mark:' : payload.status === 'down' ? ':red_circle:' : ':warning:'
  const statusText = payload.status === 'up' ? 'Online' : payload.status === 'down' ? 'Offline' : 'Degradado'
  const color = payload.status === 'up' ? '#10b981' : payload.status === 'down' ? '#ef4444' : '#f59e0b'

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: config.channel,
        attachments: [
          {
            color,
            title: `${statusEmoji} ${payload.monitorName} está ${statusText}`,
            title_link: payload.monitorUrl,
            fields: [
              {
                title: 'URL',
                value: payload.monitorUrl,
                short: true,
              },
              {
                title: 'Status',
                value: statusText,
                short: true,
              },
              ...(payload.latency
                ? [{ title: 'Latência', value: `${payload.latency}ms`, short: true }]
                : []),
              ...(payload.message
                ? [{ title: 'Mensagem', value: payload.message, short: false }]
                : []),
            ],
            footer: 'Observabilidade IT',
            ts: Math.floor(payload.checkedAt.getTime() / 1000),
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error(`Slack retornou status ${response.status}`)
      return false
    }

    console.log(`💬 Slack enviado`)
    return true
  } catch (error) {
    console.error('Erro ao enviar Slack:', error)
    return false
  }
}

// Envia para WhatsApp via Evolution API
export async function sendWhatsAppNotification(
  config: WhatsAppConfig,
  payload: NotificationPayload
): Promise<boolean> {
  const statusEmoji = payload.status === 'up' ? '✅' : payload.status === 'down' ? '🔴' : '⚠️'
  const statusText = payload.status === 'up' ? 'Online' : payload.status === 'down' ? 'Offline' : 'Degradado'

  // Usa config do canal ou variáveis de ambiente
  const evolutionUrl = config.evolutionApiUrl || env.EVOLUTION_API_URL
  const evolutionKey = config.evolutionApiKey || env.EVOLUTION_API_KEY

  if (!evolutionUrl || !evolutionKey) {
    console.warn('⚠️ EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurada, WhatsApp não enviado')
    return false
  }

  try {
    // Monta a mensagem formatada para WhatsApp
    const message = `${statusEmoji} *Monitor ${statusText}*

*Monitor:* ${payload.monitorName}
*URL:* ${payload.monitorUrl}
*Status:* ${statusText}${payload.latency ? `
*Latência:* ${payload.latency}ms` : ''}${payload.message ? `
*Mensagem:* ${payload.message}` : ''}
*Verificado em:* ${payload.checkedAt.toLocaleString('pt-BR')}

_Enviado por Taco Monitoring_`

    // Chama a Evolution API
    const response = await fetch(`${evolutionUrl}/message/sendText/${config.instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: evolutionKey,
      },
      body: JSON.stringify({
        number: config.phone,
        text: message,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error(`WhatsApp retornou status ${response.status}:`, errorData)
      return false
    }

    console.log(`📱 WhatsApp enviado para ${config.phone}`)
    return true
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error)
    return false
  }
}

// Envia para Telegram
export async function sendTelegramNotification(
  config: TelegramConfig,
  payload: NotificationPayload
): Promise<boolean> {
  const statusEmoji = payload.status === 'up' ? '✅' : payload.status === 'down' ? '🔴' : '⚠️'
  const statusText = payload.status === 'up' ? 'Online' : payload.status === 'down' ? 'Offline' : 'Degradado'

  // Usa config do canal ou variável de ambiente
  const botToken = config.botToken || env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN não configurado, Telegram não enviado')
    return false
  }

  try {
    // Monta a mensagem formatada em Markdown para Telegram
    const message = `${statusEmoji} *Monitor ${statusText}*

*Monitor:* ${escapeMarkdown(payload.monitorName)}
*URL:* ${escapeMarkdown(payload.monitorUrl)}
*Status:* ${statusText}${payload.latency ? `
*Latência:* ${payload.latency}ms` : ''}${payload.message ? `
*Mensagem:* ${escapeMarkdown(payload.message)}` : ''}
*Verificado em:* ${payload.checkedAt.toLocaleString('pt-BR')}

_Enviado por Taco Monitoring_`

    // Chama a API do Telegram
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error(`Telegram retornou status ${response.status}:`, errorData)
      return false
    }

    console.log(`📨 Telegram enviado para chat ${config.chatId}`)
    return true
  } catch (error) {
    console.error('Erro ao enviar Telegram:', error)
    return false
  }
}

// Função auxiliar para escapar caracteres especiais do Markdown do Telegram
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
}

// Envia notificação baseado no tipo do canal
export async function sendNotification(
  channelType: 'email' | 'webhook' | 'slack' | 'whatsapp' | 'telegram',
  config: EmailConfig | WebhookConfig | SlackConfig | WhatsAppConfig | TelegramConfig,
  payload: NotificationPayload
): Promise<boolean> {
  switch (channelType) {
    case 'email':
      return sendEmailNotification(config as EmailConfig, payload)
    case 'webhook':
      return sendWebhookNotification(config as WebhookConfig, payload)
    case 'slack':
      return sendSlackNotification(config as SlackConfig, payload)
    case 'whatsapp':
      return sendWhatsAppNotification(config as WhatsAppConfig, payload)
    case 'telegram':
      return sendTelegramNotification(config as TelegramConfig, payload)
    default:
      console.error(`Tipo de canal desconhecido: ${channelType}`)
      return false
  }
}
