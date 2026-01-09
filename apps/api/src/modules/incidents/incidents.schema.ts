import { z } from 'zod'

// ============================================
// Schemas de Validacao - Incidents
// ============================================

// Schema para criar um incidente (usado internamente pelo worker)
export const createIncidentSchema = z.object({
  title: z.string().min(1, 'Titulo e obrigatorio'),
  cause: z.string().optional(),
  monitorId: z.string().min(1, 'Monitor ID e obrigatorio'),
  teamId: z.string().min(1, 'Team ID e obrigatorio'),
})

// Schema para acknowledge de incidente
export const acknowledgeIncidentSchema = z.object({
  // userId vem do token JWT
})

// Schema para resolver incidente
export const resolveIncidentSchema = z.object({
  // Opcional: mensagem de resolucao
  message: z.string().optional(),
})

// Schema para adicionar update ao incidente
export const addIncidentUpdateSchema = z.object({
  message: z.string().min(1, 'Mensagem e obrigatoria'),
  status: z.enum(['ongoing', 'acknowledged', 'resolved']).optional(),
})

// Schema para parametros de ID
export const incidentIdSchema = z.object({
  id: z.string().min(1, 'ID e obrigatorio'),
})

// Schema para query de listagem
export const listIncidentsQuerySchema = z.object({
  status: z.enum(['ongoing', 'acknowledged', 'resolved', 'all']).optional(),
  monitorId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

// Tipos inferidos
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>
export type AcknowledgeIncidentInput = z.infer<typeof acknowledgeIncidentSchema>
export type ResolveIncidentInput = z.infer<typeof resolveIncidentSchema>
export type AddIncidentUpdateInput = z.infer<typeof addIncidentUpdateSchema>
export type IncidentIdParams = z.infer<typeof incidentIdSchema>
export type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>

// Tipo do Incident com relacionamentos
export interface IncidentWithDetails {
  id: string
  title: string
  status: string
  cause: string | null
  startedAt: Date
  resolvedAt: Date | null
  acknowledgedAt: Date | null
  createdAt: Date
  updatedAt: Date
  monitor: {
    id: string
    name: string
    url: string
  }
  acknowledgedBy: {
    id: string
    name: string | null
    email: string
  } | null
  updates: {
    id: string
    message: string
    status: string
    createdAt: Date
  }[]
  // Duracao calculada
  duration?: number // em segundos
}
