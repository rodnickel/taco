import { z } from 'zod'

// ============================================
// Schemas de Validação - Alert Channels
// ============================================

// Config para cada tipo de canal
const emailConfigSchema = z.object({
  email: z.string().email('Email inválido'),
})

const webhookConfigSchema = z.object({
  url: z.string().url('URL inválida'),
  method: z.enum(['POST', 'GET']).default('POST'),
  headers: z.record(z.string()).optional(),
})

const slackConfigSchema = z.object({
  webhookUrl: z.string().url('URL do webhook inválida'),
  channel: z.string().optional(),
})

const whatsappConfigSchema = z.object({
  phone: z.string().min(10, 'Telefone deve ter no mínimo 10 dígitos'), // Ex: 5511999999999
  instanceName: z.string().min(1, 'Nome da instância é obrigatório'), // Nome da instância na Evolution API
  evolutionApiUrl: z.string().url('URL da Evolution API inválida').optional(), // Se não informado, usa env
  evolutionApiKey: z.string().optional(), // Se não informado, usa env
})

const telegramConfigSchema = z.object({
  chatId: z.string().min(1, 'Chat ID é obrigatório'), // ID do chat/grupo/canal
  botToken: z.string().optional(), // Se não informado, usa env
})

// Schema para criar um canal de alerta
export const createAlertChannelSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  type: z.enum(['email', 'webhook', 'slack', 'whatsapp', 'telegram']),
  config: z.union([
    emailConfigSchema,
    webhookConfigSchema,
    slackConfigSchema,
    whatsappConfigSchema,
    telegramConfigSchema,
  ]),
  active: z.boolean().default(true),
})

// Schema para atualizar um canal
export const updateAlertChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  config: z
    .union([
      emailConfigSchema,
      webhookConfigSchema,
      slackConfigSchema,
      whatsappConfigSchema,
      telegramConfigSchema,
    ])
    .optional(),
  active: z.boolean().optional(),
})

// Schema para parâmetros de ID
// Nota: Prisma usa CUID (25 chars) ou CUID2 (variável), então validamos apenas como string não-vazia
export const alertChannelIdSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
})

// Schema para query de listagem
export const listAlertChannelsQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
  type: z.enum(['email', 'webhook', 'slack', 'whatsapp', 'telegram']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

// Tipos inferidos
export type CreateAlertChannelInput = z.infer<typeof createAlertChannelSchema>
export type UpdateAlertChannelInput = z.infer<typeof updateAlertChannelSchema>
export type AlertChannelIdParams = z.infer<typeof alertChannelIdSchema>
export type ListAlertChannelsQuery = z.infer<typeof listAlertChannelsQuerySchema>

// Tipos de configuração
export type EmailConfig = z.infer<typeof emailConfigSchema>
export type WebhookConfig = z.infer<typeof webhookConfigSchema>
export type SlackConfig = z.infer<typeof slackConfigSchema>
export type WhatsAppConfig = z.infer<typeof whatsappConfigSchema>
export type TelegramConfig = z.infer<typeof telegramConfigSchema>
export type AlertChannelConfig =
  | EmailConfig
  | WebhookConfig
  | SlackConfig
  | WhatsAppConfig
  | TelegramConfig

// Interface do AlertChannel completo
export interface AlertChannel {
  id: string
  name: string
  type: 'email' | 'webhook' | 'slack' | 'whatsapp' | 'telegram'
  config: AlertChannelConfig
  active: boolean
  createdAt: Date
  updatedAt: Date
  teamId: string
}

// ============================================
// Schemas de Validação - Escalation Policies
// ============================================

// Schema para criar um nível de escalonamento
export const escalationLevelSchema = z.object({
  level: z.number().int().min(1).max(10),
  channelId: z.string().min(1, 'Canal é obrigatório'),
  delayMinutes: z.number().int().min(0).max(1440).default(0), // Max 24h
  repeatCount: z.number().int().min(1).max(10).default(1),
  repeatInterval: z.number().int().min(1).max(60).default(5), // Intervalo em minutos
})

// Schema para criar uma política de escalonamento
export const createEscalationPolicySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional(),
  active: z.boolean().default(true),
  levels: z.array(escalationLevelSchema).min(1, 'Pelo menos um nível é obrigatório'),
})

// Schema para atualizar uma política
export const updateEscalationPolicySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  active: z.boolean().optional(),
  levels: z.array(escalationLevelSchema).optional(),
})

// Tipos inferidos
export type EscalationLevelInput = z.infer<typeof escalationLevelSchema>
export type CreateEscalationPolicyInput = z.infer<typeof createEscalationPolicySchema>
export type UpdateEscalationPolicyInput = z.infer<typeof updateEscalationPolicySchema>
