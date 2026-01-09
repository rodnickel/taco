import { z } from 'zod'

// ============================================
// Schemas de Validação para Grupos
// ============================================

export const groupIdSchema = z.object({
  id: z.string().cuid(),
})

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional(),
  monitorIds: z.array(z.string().cuid()).optional(),
})

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  monitorIds: z.array(z.string().cuid()).optional(),
})

export const addMonitorsToGroupSchema = z.object({
  monitorIds: z.array(z.string().cuid()).min(1),
})

export const removeMonitorsFromGroupSchema = z.object({
  monitorIds: z.array(z.string().cuid()).min(1),
})

// ============================================
// Tipos
// ============================================

export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>
export type AddMonitorsInput = z.infer<typeof addMonitorsToGroupSchema>
export type RemoveMonitorsInput = z.infer<typeof removeMonitorsFromGroupSchema>
