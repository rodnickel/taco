import { z } from 'zod'

// ============================================
// Schemas de Validação - Status Pages
// ============================================

// Schema para criar uma status page
export const createStatusPageSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug deve ter no mínimo 3 caracteres')
    .max(50, 'Slug deve ter no máximo 50 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url('URL do logo inválida').optional().nullable(),
  faviconUrl: z.string().url('URL do favicon inválida').optional().nullable(),
  isPublic: z.boolean().default(true),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve ser um hex válido').default('#10b981'),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve ser um hex válido').default('#09090b'),
  showUptime: z.boolean().default(true),
  showLatency: z.boolean().default(true),
  showHistory: z.boolean().default(true),
  historyDays: z.number().int().min(7).max(365).default(90),
  customDomain: z.string().optional().nullable(),
  monitorIds: z.array(z.string()).optional(), // IDs dos monitors a serem incluídos
})

// Schema para atualizar uma status page
export const updateStatusPageSchema = createStatusPageSchema.partial()

// Schema para parâmetros de ID
export const statusPageIdSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
})

// Schema para parâmetros de slug (rota pública)
export const statusPageSlugSchema = z.object({
  slug: z.string().min(1, 'Slug é obrigatório'),
})

// Schema para adicionar/remover monitors
export const updateStatusPageMonitorsSchema = z.object({
  monitors: z.array(z.object({
    monitorId: z.string(),
    displayName: z.string().optional().nullable(),
    displayOrder: z.number().int().min(0).default(0),
    sectionId: z.string().optional().nullable(),
  })),
})

// Schema para seções
export const sectionSchema = z.object({
  id: z.string().optional(), // Se presente, atualiza; se ausente, cria nova
  name: z.string().min(1, 'Nome da seção é obrigatório').max(100),
  displayOrder: z.number().int().min(0).default(0),
})

// Schema para atualizar seções e monitors
export const updateStatusPageLayoutSchema = z.object({
  sections: z.array(sectionSchema),
  monitors: z.array(z.object({
    monitorId: z.string(),
    displayName: z.string().optional().nullable(),
    displayOrder: z.number().int().min(0).default(0),
    sectionId: z.string().optional().nullable(),
  })),
})

// Schema para grupo na status page
export const statusPageGroupSchema = z.object({
  groupId: z.string(),
  displayName: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  isExpanded: z.boolean().default(true),
})

// Schema para atualizar grupos da status page
export const updateStatusPageGroupsSchema = z.object({
  groups: z.array(statusPageGroupSchema),
})

// Schema para query de incidentes públicos
export const publicIncidentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(['all', 'ongoing', 'resolved']).default('all'),
})

// Tipos inferidos
export type PublicIncidentsQuery = z.infer<typeof publicIncidentsQuerySchema>
export type CreateStatusPageInput = z.infer<typeof createStatusPageSchema>
export type UpdateStatusPageInput = z.infer<typeof updateStatusPageSchema>
export type StatusPageIdParams = z.infer<typeof statusPageIdSchema>
export type StatusPageSlugParams = z.infer<typeof statusPageSlugSchema>
export type UpdateStatusPageMonitorsInput = z.infer<typeof updateStatusPageMonitorsSchema>
export type UpdateStatusPageLayoutInput = z.infer<typeof updateStatusPageLayoutSchema>
export type SectionInput = z.infer<typeof sectionSchema>
export type StatusPageGroupInput = z.infer<typeof statusPageGroupSchema>
export type UpdateStatusPageGroupsInput = z.infer<typeof updateStatusPageGroupsSchema>

// Tipo de seção
export interface StatusPageSectionData {
  id: string
  name: string
  displayOrder: number
}

// Tipo da StatusPage com monitors
export interface StatusPageWithMonitors {
  id: string
  slug: string
  name: string
  description: string | null
  logoUrl: string | null
  faviconUrl: string | null
  isPublic: boolean
  primaryColor: string
  backgroundColor: string
  showUptime: boolean
  showLatency: boolean
  showHistory: boolean
  historyDays: number
  customDomain: string | null
  createdAt: Date
  updatedAt: Date
  teamId: string
  sections: StatusPageSectionData[]
  monitors: {
    id: string
    displayName: string | null
    displayOrder: number
    sectionId: string | null
    monitor: {
      id: string
      name: string
      url: string
      currentStatus: string | null
      lastCheck: Date | null
      lastLatency: number | null
    }
  }[]
}

// Monitor público com dados de histórico
export interface PublicMonitor {
  name: string
  currentStatus: string | null
  lastCheck: Date | null
  lastLatency: number | null
  uptimePercentage?: number
  history?: {
    date: string
    status: string
    uptimePercentage: number
  }[]
}

// Seção pública com monitors
export interface PublicSection {
  id: string
  name: string
  displayOrder: number
  monitors: PublicMonitor[]
}

// Grupo público com monitors e status agregado
export interface PublicGroup {
  id: string
  name: string
  description: string | null
  displayOrder: number
  isExpanded: boolean
  status: 'up' | 'down' | 'partial' | 'degraded' | 'unknown'
  monitorsUp: number
  monitorsDown: number
  monitorsTotal: number
  monitors: PublicMonitor[]
}

// Tipo para a página pública (sem dados sensíveis)
export interface PublicStatusPage {
  slug: string
  name: string
  description: string | null
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string
  backgroundColor: string
  showUptime: boolean
  showLatency: boolean
  showHistory: boolean
  historyDays: number
  sections: PublicSection[]
  monitors: PublicMonitor[] // Monitors sem seção
  groups: PublicGroup[] // Grupos de monitores
}
