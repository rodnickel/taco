import { z } from 'zod'

// Schema para atualização via webhook
export const webhookUpdateSchema = z.object({
  status: z.enum(['up', 'down', 'degraded']),
  message: z.string().optional(),
  metadata: z.record(z.any()).optional(), // Dados adicionais que o serviço externo enviar
})

export type WebhookUpdateInput = z.infer<typeof webhookUpdateSchema>
