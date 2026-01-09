import * as tls from 'tls'
import * as https from 'https'
import { prisma } from '../lib/prisma.js'
import { findActiveChannelsByTeamId, createAlert } from '../modules/alerts/alerts.service.js'
import { sendNotification } from './notification.service.js'

// ============================================
// Serviço de Verificação de Certificados SSL
// ============================================

export interface SSLCertificateInfo {
  valid: boolean
  issuer: string | null
  subject: string | null
  validFrom: Date | null
  validTo: Date | null
  daysUntilExpiry: number | null
  error: string | null
}

// Verifica o certificado SSL de uma URL
export async function checkSSLCertificate(url: string): Promise<SSLCertificateInfo> {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url)

      // Só verifica HTTPS
      if (urlObj.protocol !== 'https:') {
        resolve({
          valid: false,
          issuer: null,
          subject: null,
          validFrom: null,
          validTo: null,
          daysUntilExpiry: null,
          error: 'URL não usa HTTPS',
        })
        return
      }

      const options = {
        host: urlObj.hostname,
        port: urlObj.port ? parseInt(urlObj.port) : 443,
        servername: urlObj.hostname, // SNI
        rejectUnauthorized: false, // Queremos ver certificados mesmo inválidos
      }

      const socket = tls.connect(options, () => {
        const cert = socket.getPeerCertificate()
        socket.destroy()

        if (!cert || Object.keys(cert).length === 0) {
          resolve({
            valid: false,
            issuer: null,
            subject: null,
            validFrom: null,
            validTo: null,
            daysUntilExpiry: null,
            error: 'Certificado não encontrado',
          })
          return
        }

        const validFrom = new Date(cert.valid_from)
        const validTo = new Date(cert.valid_to)
        const now = new Date()
        const daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // Verifica se está expirado ou ainda não é válido
        const isExpired = now > validTo
        const isNotYetValid = now < validFrom
        const isValid = !isExpired && !isNotYetValid && socket.authorized !== false

        resolve({
          valid: isValid,
          issuer: cert.issuer?.O || cert.issuer?.CN || null,
          subject: cert.subject?.CN || null,
          validFrom,
          validTo,
          daysUntilExpiry: isExpired ? -Math.abs(daysUntilExpiry) : daysUntilExpiry,
          error: isExpired
            ? 'Certificado expirado'
            : isNotYetValid
            ? 'Certificado ainda não é válido'
            : null,
        })
      })

      socket.on('error', (err) => {
        socket.destroy()
        resolve({
          valid: false,
          issuer: null,
          subject: null,
          validFrom: null,
          validTo: null,
          daysUntilExpiry: null,
          error: err.message,
        })
      })

      // Timeout de 10 segundos
      socket.setTimeout(10000, () => {
        socket.destroy()
        resolve({
          valid: false,
          issuer: null,
          subject: null,
          validFrom: null,
          validTo: null,
          daysUntilExpiry: null,
          error: 'Timeout ao verificar certificado',
        })
      })
    } catch (err) {
      resolve({
        valid: false,
        issuer: null,
        subject: null,
        validFrom: null,
        validTo: null,
        daysUntilExpiry: null,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      })
    }
  })
}

// Verifica todos os monitores HTTPS e alerta se certificados estão próximos de expirar
export async function checkAllSSLCertificates(alertDays: number = 30) {
  console.log(`🔐 Verificando certificados SSL (alerta: ${alertDays} dias)...`)

  // Busca monitores ativos com URLs HTTPS
  const monitors = await prisma.monitor.findMany({
    where: {
      active: true,
      url: { startsWith: 'https://' },
      checkSsl: true,
    },
    select: {
      id: true,
      name: true,
      url: true,
      teamId: true,
    },
  })

  console.log(`   Encontrados ${monitors.length} monitores HTTPS`)

  let checked = 0
  let expiringSoon = 0
  let expired = 0

  for (const monitor of monitors) {
    const sslInfo = await checkSSLCertificate(monitor.url)
    checked++

    // Atualiza informações do certificado no banco (futuro: adicionar campos no monitor)
    console.log(
      `   [${checked}/${monitors.length}] ${monitor.name}: ` +
        (sslInfo.valid
          ? `✅ Válido (expira em ${sslInfo.daysUntilExpiry} dias)`
          : `❌ ${sslInfo.error}`)
    )

    // Verifica se precisa alertar
    if (sslInfo.daysUntilExpiry !== null) {
      if (sslInfo.daysUntilExpiry <= 0) {
        expired++
        await sendSSLAlert(monitor, sslInfo, 'expired')
      } else if (sslInfo.daysUntilExpiry <= alertDays) {
        expiringSoon++
        await sendSSLAlert(monitor, sslInfo, 'expiring')
      }
    } else if (!sslInfo.valid && sslInfo.error) {
      // Certificado com problema
      await sendSSLAlert(monitor, sslInfo, 'invalid')
    }
  }

  console.log(
    `🔐 Verificação SSL concluída: ${checked} verificados, ` +
      `${expiringSoon} expirando em breve, ${expired} expirados`
  )

  return { checked, expiringSoon, expired }
}

// Envia alerta de SSL
async function sendSSLAlert(
  monitor: { id: string; name: string; url: string; teamId: string },
  sslInfo: SSLCertificateInfo,
  type: 'expired' | 'expiring' | 'invalid'
) {
  try {
    // Busca canais de alerta do time
    const channels = await findActiveChannelsByTeamId(monitor.teamId)

    if (channels.length === 0) {
      return
    }

    // Monta mensagem
    let message: string
    let subject: string

    switch (type) {
      case 'expired':
        message = `O certificado SSL de "${monitor.name}" (${monitor.url}) EXPIROU em ${sslInfo.validTo?.toLocaleDateString('pt-BR')}`
        subject = `🔴 Certificado SSL expirado: ${monitor.name}`
        break
      case 'expiring':
        message = `O certificado SSL de "${monitor.name}" (${monitor.url}) vai expirar em ${sslInfo.daysUntilExpiry} dias (${sslInfo.validTo?.toLocaleDateString('pt-BR')})`
        subject = `⚠️ Certificado SSL expirando: ${monitor.name}`
        break
      case 'invalid':
        message = `Problema no certificado SSL de "${monitor.name}" (${monitor.url}): ${sslInfo.error}`
        subject = `🔴 Problema no certificado SSL: ${monitor.name}`
        break
    }

    // Envia para cada canal
    for (const channel of channels) {
      try {
        // Registra o alerta
        await createAlert(monitor.id, channel.id, 'down', message)

        // Envia notificação
        await sendNotification(
          channel.type as 'email' | 'webhook' | 'slack' | 'whatsapp' | 'telegram',
          channel.config as Record<string, string>,
          {
            monitorName: monitor.name,
            monitorUrl: monitor.url,
            status: type === 'expiring' ? 'degraded' : 'down',
            message,
            checkedAt: new Date(),
          }
        )

        console.log(`   📧 Alerta SSL enviado via ${channel.type}: ${channel.name}`)
      } catch (err) {
        console.error(`   ❌ Erro ao enviar alerta SSL via ${channel.type}:`, err)
      }
    }
  } catch (err) {
    console.error('Erro ao enviar alerta SSL:', err)
  }
}

// Verifica SSL de um monitor específico (para uso na API)
export async function checkMonitorSSL(monitorId: string): Promise<SSLCertificateInfo | null> {
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
    select: { url: true },
  })

  if (!monitor) return null

  return checkSSLCertificate(monitor.url)
}
