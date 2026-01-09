import { z } from 'zod'

// ============================================
// Schemas de Validação - Maintenance Windows
// ============================================

// Schema para criar uma janela de manutenção
export const createMaintenanceSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().max(500).optional(),
  startTime: z.string().datetime('Data de início inválida'),
  endTime: z.string().datetime('Data de fim inválida'),
  type: z.enum(['scheduled', 'emergency']).default('scheduled'),
  suppressAlerts: z.boolean().default(true),
  suppressIncidents: z.boolean().default(true),
  showOnStatusPage: z.boolean().default(true),
  monitorIds: z.array(z.string()).min(1, 'Selecione ao menos um monitor'),
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: 'Data de fim deve ser posterior à data de início',
  path: ['endTime'],
})

// Schema para atualizar uma janela de manutenção
export const updateMaintenanceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  type: z.enum(['scheduled', 'emergency']).optional(),
  active: z.boolean().optional(),
  suppressAlerts: z.boolean().optional(),
  suppressIncidents: z.boolean().optional(),
  showOnStatusPage: z.boolean().optional(),
  monitorIds: z.array(z.string()).min(1).optional(),
})

// Schema para query de listagem
export const listMaintenanceQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
  status: z.enum(['upcoming', 'ongoing', 'past', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

// Tipos inferidos
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>
export type ListMaintenanceQuery = z.infer<typeof listMaintenanceQuerySchema>

// Interface da MaintenanceWindow
export interface MaintenanceWindow {
  id: string
  name: string
  description: string | null
  startTime: Date
  endTime: Date
  type: 'scheduled' | 'emergency'
  active: boolean
  suppressAlerts: boolean
  suppressIncidents: boolean
  showOnStatusPage: boolean
  createdAt: Date
  updatedAt: Date
  teamId: string
  monitors: {
    id: string
    monitorId: string
    monitor: {
      id: string
      name: string
      url: string
    }
  }[]
}
