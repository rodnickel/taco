// ============================================
// Cliente HTTP para comunicação com a API
// ============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

// Tipos de resposta da API
export interface ApiError {
  error: string
  code: string
  details?: Array<{ field: string; message: string }>
}

export interface User {
  id: string
  email: string
  name: string | null
  createdAt: string
}

export interface AuthResponse {
  message: string
  user: User
  token: string
}

// ----------------------------------------
// Função para obter o team ID atual
// ----------------------------------------
export function getCurrentTeamId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('currentTeamId')
}

export function setCurrentTeamId(teamId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('currentTeamId', teamId)
}

// ----------------------------------------
// Função base para fazer requisições
// ----------------------------------------
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`

  // Pega o token do localStorage (se existir)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const teamId = getCurrentTeamId()

  // Só inclui Content-Type: application/json se houver body
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(teamId ? { 'X-Team-Id': teamId } : {}),
  }

  // Adiciona Content-Type apenas se houver body
  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })

  // Se for 204 No Content, retorna sem tentar parsear JSON
  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json()

  if (!response.ok) {
    throw data as ApiError
  }

  return data as T
}

// ============================================
// Funções de Autenticação
// ============================================

export async function register(email: string, password: string, name?: string) {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })
}

export async function login(email: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function logout() {
  return request<{ message: string }>('/auth/logout', {
    method: 'POST',
  })
}

export async function getMe() {
  return request<{ user: User }>('/auth/me')
}

// ============================================
// Tipos de Teams
// ============================================

export type TeamRole = 'ADMIN' | 'EDITOR' | 'VIEWER'

export interface Team {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
  ownerId: string
  owner: {
    id: string
    name: string | null
    email: string
  }
  members: TeamMember[]
  _count: {
    monitors: number
    alertChannels: number
    statusPages: number
  }
}

export interface TeamMember {
  id: string
  role: TeamRole
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

export interface TeamInvite {
  id: string
  email: string | null
  token: string
  role: TeamRole
  expiresAt: string
  usedAt: string | null
  maxUses: number
  useCount: number
  createdAt: string
  invitedBy: {
    id: string
    name: string | null
    email: string
  }
}

export interface PublicInviteInfo {
  teamName: string
  teamSlug: string
  role: TeamRole
  expiresAt: string
  invitedByName: string | null
  invitedByEmail: string
}

export interface CreateTeamData {
  name: string
  slug: string
}

export interface UpdateTeamData {
  name?: string
  slug?: string
}

export interface CreateInviteData {
  email?: string
  role?: TeamRole
  expiresInDays?: number
  maxUses?: number
}

// ============================================
// Funções de Teams
// ============================================

export async function getTeams() {
  return request<Team[]>('/teams')
}

export async function getTeam(id: string) {
  return request<Team>(`/teams/${id}`)
}

export async function createTeam(data: CreateTeamData) {
  return request<Team>('/teams', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateTeam(id: string, data: UpdateTeamData) {
  return request<Team>(`/teams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteTeam(id: string) {
  return request<void>(`/teams/${id}`, {
    method: 'DELETE',
  })
}

// Team Members
export async function getTeamMembers(teamId: string) {
  return request<TeamMember[]>(`/teams/${teamId}/members`)
}

export async function updateMemberRole(teamId: string, userId: string, role: TeamRole) {
  return request<TeamMember>(`/teams/${teamId}/members/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  })
}

export async function removeMember(teamId: string, userId: string) {
  return request<void>(`/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
  })
}

export async function leaveTeam(teamId: string) {
  return request<void>(`/teams/${teamId}/leave`, {
    method: 'POST',
  })
}

// Team Invites
export async function createInvite(teamId: string, data: CreateInviteData) {
  return request<TeamInvite>(`/teams/${teamId}/invites`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getTeamInvites(teamId: string) {
  return request<TeamInvite[]>(`/teams/${teamId}/invites`)
}

export async function revokeInvite(teamId: string, inviteId: string) {
  return request<void>(`/teams/${teamId}/invites/${inviteId}`, {
    method: 'DELETE',
  })
}

export async function getInviteInfo(token: string) {
  return request<PublicInviteInfo>(`/invites/${token}`)
}

export async function acceptInvite(token: string) {
  return request<{ teamId: string; role: TeamRole }>(`/invites/${token}/accept`, {
    method: 'POST',
  })
}

// ============================================
// Tipos de Monitors
// ============================================

export interface RequestHeader {
  key: string
  value: string
}

export interface Monitor {
  id: string
  name: string
  url: string
  method: string
  intervalSeconds: number
  timeout: number
  expectedStatus: number
  checkSsl: boolean
  active: boolean
  alertsEnabled: boolean
  // Configurações avançadas
  recoveryPeriod: number
  confirmationPeriod: number
  followRedirects: boolean
  requestBody: string | null
  requestHeaders: RequestHeader[] | null
  // Timestamps e status
  createdAt: string
  updatedAt: string
  teamId: string
  currentStatus?: 'up' | 'down' | 'degraded' | 'unknown'
  lastCheck?: string
  lastLatency?: number
  uptimePercentage?: number
  consecutiveFails?: number
}

export interface MonitorListResponse {
  monitors: Monitor[]
  total: number
  limit: number
  offset: number
}

export interface CreateMonitorData {
  name: string
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'
  intervalSeconds?: number
  timeout?: number
  expectedStatus?: number
  checkSsl?: boolean
  active?: boolean
  alertsEnabled?: boolean
  // Configurações avançadas
  recoveryPeriod?: number
  confirmationPeriod?: number
  followRedirects?: boolean
  requestBody?: string | null
  requestHeaders?: RequestHeader[] | null
}

export interface UpdateMonitorData {
  name?: string
  url?: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'
  intervalSeconds?: number
  timeout?: number
  expectedStatus?: number
  checkSsl?: boolean
  active?: boolean
  alertsEnabled?: boolean
  // Configurações avançadas
  recoveryPeriod?: number
  confirmationPeriod?: number
  followRedirects?: boolean
  requestBody?: string | null
  requestHeaders?: RequestHeader[] | null
}

// ============================================
// Funções de Monitors
// ============================================

export async function getMonitors(params?: { active?: boolean; limit?: number; offset?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.active !== undefined) searchParams.set('active', String(params.active))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))

  const query = searchParams.toString()
  return request<MonitorListResponse>(`/monitors${query ? `?${query}` : ''}`)
}

export async function getMonitor(id: string) {
  return request<Monitor>(`/monitors/${id}`)
}

export async function createMonitor(data: CreateMonitorData) {
  return request<Monitor>('/monitors', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateMonitor(id: string, data: UpdateMonitorData) {
  return request<Monitor>(`/monitors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteMonitor(id: string) {
  return request<void>(`/monitors/${id}`, {
    method: 'DELETE',
  })
}

// ============================================
// Tipos e Funções de Histórico
// ============================================

export interface DailyUptimeData {
  date: string // YYYY-MM-DD
  totalChecks: number
  upChecks: number
  downChecks: number
  avgLatency: number | null
  uptimePercentage: number
  status: 'up' | 'down' | 'degraded' | 'no_data'
}

export interface MonitorHistoryResponse {
  history: DailyUptimeData[]
  days: number
}

export async function getMonitorHistory(id: string, days: number = 90) {
  return request<MonitorHistoryResponse>(`/monitors/${id}/history?days=${days}`)
}

// ============================================
// Tipos e Funções de SSL
// ============================================

export interface SSLInfo {
  valid: boolean
  issuer: string | null
  subject: string | null
  validFrom: string | null
  validTo: string | null
  daysUntilExpiry: number | null
  error: string | null
}

export interface MonitorSSLResponse {
  monitorId: string
  monitorName: string
  url: string
  ssl: SSLInfo
}

export async function getMonitorSSL(id: string) {
  return request<MonitorSSLResponse>(`/monitors/${id}/ssl`)
}

// ============================================
// Tipos de Alert Channels
// ============================================

export interface AlertChannel {
  id: string
  name: string
  type: 'email' | 'webhook' | 'slack'
  config: Record<string, string>
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AlertChannelListResponse {
  channels: AlertChannel[]
  total: number
  limit: number
  offset: number
}

export interface CreateAlertChannelData {
  name: string
  type: 'email' | 'webhook' | 'slack'
  config: Record<string, string>
  active?: boolean
}

export interface UpdateAlertChannelData {
  name?: string
  config?: Record<string, string>
  active?: boolean
}

// ============================================
// Funções de Alert Channels
// ============================================

export async function getAlertChannels(params?: { active?: boolean; type?: string; limit?: number; offset?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.active !== undefined) searchParams.set('active', String(params.active))
  if (params?.type) searchParams.set('type', params.type)
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))

  const query = searchParams.toString()
  return request<AlertChannelListResponse>(`/alerts/channels${query ? `?${query}` : ''}`)
}

export async function getAlertChannel(id: string) {
  return request<AlertChannel>(`/alerts/channels/${id}`)
}

export async function createAlertChannel(data: CreateAlertChannelData) {
  return request<AlertChannel>('/alerts/channels', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAlertChannel(id: string, data: UpdateAlertChannelData) {
  return request<AlertChannel>(`/alerts/channels/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteAlertChannel(id: string) {
  return request<void>(`/alerts/channels/${id}`, {
    method: 'DELETE',
  })
}

// ============================================
// Tipos de Status Pages
// ============================================

export interface StatusPageSection {
  id: string
  name: string
  displayOrder: number
}

export interface StatusPageMonitor {
  id: string
  displayName: string | null
  displayOrder: number
  sectionId: string | null
  monitor: {
    id: string
    name: string
    url: string
    currentStatus: string | null
    lastCheck: string | null
    lastLatency: number | null
  }
}

export interface StatusPage {
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
  createdAt: string
  updatedAt: string
  teamId: string
  sections: StatusPageSection[]
  monitors: StatusPageMonitor[]
}

export interface StatusPageListResponse {
  statusPages: StatusPage[]
}

export interface CreateStatusPageData {
  slug: string
  name: string
  description?: string
  logoUrl?: string | null
  faviconUrl?: string | null
  isPublic?: boolean
  primaryColor?: string
  backgroundColor?: string
  showUptime?: boolean
  showLatency?: boolean
  showHistory?: boolean
  historyDays?: number
  customDomain?: string | null
  monitorIds?: string[]
}

export interface UpdateStatusPageData {
  slug?: string
  name?: string
  description?: string
  logoUrl?: string | null
  faviconUrl?: string | null
  isPublic?: boolean
  primaryColor?: string
  backgroundColor?: string
  showUptime?: boolean
  showLatency?: boolean
  showHistory?: boolean
  historyDays?: number
  customDomain?: string | null
}

export interface UpdateStatusPageLayoutData {
  sections: {
    id?: string
    name: string
    displayOrder: number
  }[]
  monitors: {
    monitorId: string
    displayName?: string | null
    displayOrder: number
    sectionId?: string | null
  }[]
}

export interface PublicMonitor {
  name: string
  currentStatus: string | null
  lastCheck: string | null
  lastLatency: number | null
  uptimePercentage?: number
  history?: {
    date: string
    status: string
    uptimePercentage: number
  }[]
}

export interface PublicSection {
  id: string
  name: string
  displayOrder: number
  monitors: PublicMonitor[]
}

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
  monitors: PublicMonitor[]
  groups: PublicGroup[]
}

// ============================================
// Funções de Status Pages
// ============================================

export async function getStatusPages() {
  return request<StatusPageListResponse>('/status-pages')
}

export async function getStatusPage(id: string) {
  return request<StatusPage>(`/status-pages/${id}`)
}

export async function createStatusPage(data: CreateStatusPageData) {
  return request<StatusPage>('/status-pages', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateStatusPage(id: string, data: UpdateStatusPageData) {
  return request<StatusPage>(`/status-pages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function updateStatusPageLayout(id: string, data: UpdateStatusPageLayoutData) {
  return request<StatusPage>(`/status-pages/${id}/layout`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// Tipo para grupo na status page
export interface StatusPageGroupData {
  groupId: string
  displayName: string | null
  displayOrder: number
  isExpanded: boolean
  group: {
    id: string
    name: string
    description: string | null
    monitorsCount: number
    monitorsUp: number
    monitorsDown: number
  }
}

export interface UpdateStatusPageGroupsData {
  groups: {
    groupId: string
    displayName?: string | null
    displayOrder: number
    isExpanded: boolean
  }[]
}

export async function getStatusPageGroups(id: string) {
  return request<{ groups: StatusPageGroupData[] }>(`/status-pages/${id}/groups`)
}

export async function updateStatusPageGroups(id: string, data: UpdateStatusPageGroupsData) {
  return request<StatusPage>(`/status-pages/${id}/groups`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteStatusPage(id: string) {
  return request<void>(`/status-pages/${id}`, {
    method: 'DELETE',
  })
}

export async function checkSlugAvailable(slug: string) {
  return request<{ available: boolean }>(`/status-pages/check-slug/${slug}`)
}

// Rota pública (não requer autenticação)
export async function getPublicStatusPage(slug: string) {
  return request<PublicStatusPage>(`/public/status/${slug}`)
}

// ============================================
// Tipos de Incidentes Públicos
// ============================================

export interface PublicIncidentUpdate {
  id: string
  message: string
  status: string
  createdAt: string
}

export interface PublicIncident {
  id: string
  title: string
  status: 'ongoing' | 'acknowledged' | 'resolved'
  cause: string | null
  startedAt: string
  resolvedAt: string | null
  duration: number // em segundos
  monitor: {
    id: string
    name: string
  }
  updates: PublicIncidentUpdate[]
}

export interface PublicIncidentsResponse {
  incidents: PublicIncident[]
  total: number
  limit: number
  offset: number
}

// ============================================
// Tipos de Manutenções Públicas
// ============================================

export interface PublicMaintenance {
  id: string
  name: string
  description: string | null
  startTime: string
  endTime: string
  status: 'ongoing' | 'upcoming' | 'past'
  monitors: {
    id: string
    name: string
  }[]
}

export interface PublicMaintenancesResponse {
  maintenances: PublicMaintenance[]
}

// ============================================
// Funções de Status Page Pública
// ============================================

export async function getPublicIncidents(
  slug: string,
  params?: { limit?: number; offset?: number; status?: 'all' | 'ongoing' | 'resolved' }
) {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))
  if (params?.status) searchParams.set('status', params.status)

  const query = searchParams.toString()
  return request<PublicIncidentsResponse>(`/public/status/${slug}/incidents${query ? `?${query}` : ''}`)
}

export async function getPublicMaintenances(slug: string) {
  return request<PublicMaintenancesResponse>(`/public/status/${slug}/maintenances`)
}

// ============================================
// Tipos de Incidents
// ============================================

export interface IncidentUpdate {
  id: string
  message: string
  status: string
  createdAt: string
}

export interface Incident {
  id: string
  title: string
  status: 'ongoing' | 'acknowledged' | 'resolved'
  cause: string | null
  startedAt: string
  resolvedAt: string | null
  acknowledgedAt: string | null
  createdAt: string
  updatedAt: string
  duration: number // em segundos
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
  updates?: IncidentUpdate[]
  _count?: {
    updates: number
  }
}

export interface IncidentListResponse {
  incidents: Incident[]
  total: number
  limit: number
  offset: number
}

// ============================================
// Funcoes de Incidents
// ============================================

export async function getIncidents(params?: {
  status?: 'ongoing' | 'acknowledged' | 'resolved' | 'all'
  monitorId?: string
  limit?: number
  offset?: number
}) {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.monitorId) searchParams.set('monitorId', params.monitorId)
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))

  const query = searchParams.toString()
  return request<IncidentListResponse>(`/incidents${query ? `?${query}` : ''}`)
}

export async function getIncident(id: string) {
  return request<Incident>(`/incidents/${id}`)
}

export async function getIncidentCount() {
  return request<{ count: number }>('/incidents/count')
}

export async function acknowledgeIncident(id: string) {
  return request<Incident>(`/incidents/${id}/acknowledge`, {
    method: 'POST',
  })
}

export async function resolveIncident(id: string, message?: string) {
  return request<Incident>(`/incidents/${id}/resolve`, {
    method: 'POST',
    body: message ? JSON.stringify({ message }) : undefined,
  })
}

export async function addIncidentUpdate(id: string, message: string, status?: string) {
  return request<IncidentUpdate>(`/incidents/${id}/updates`, {
    method: 'POST',
    body: JSON.stringify({ message, status }),
  })
}

// ============================================
// Tipos de Grupos de Monitores
// ============================================

export type GroupStatus = 'up' | 'down' | 'partial' | 'degraded' | 'unknown'

export interface MonitorInGroup {
  id: string
  name: string
  url: string
  currentStatus: string | null
  lastCheck: string | null
  lastLatency: number | null
}

export interface MonitorGroup {
  id: string
  name: string
  description: string | null
  status: GroupStatus
  monitorsUp: number
  monitorsDown: number
  monitorsTotal: number
  monitors: MonitorInGroup[]
  createdAt: string
  updatedAt: string
}

export interface CreateGroupInput {
  name: string
  description?: string
  monitorIds?: string[]
}

export interface UpdateGroupInput {
  name?: string
  description?: string | null
  monitorIds?: string[]
}

// ============================================
// API de Grupos de Monitores
// ============================================

export async function getGroups() {
  return request<MonitorGroup[]>('/groups')
}

export async function getGroup(id: string) {
  return request<MonitorGroup>(`/groups/${id}`)
}

export async function getUngroupedMonitors() {
  return request<MonitorInGroup[]>('/groups/ungrouped')
}

export async function createGroup(data: CreateGroupInput) {
  return request<MonitorGroup>('/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateGroup(id: string, data: UpdateGroupInput) {
  return request<MonitorGroup>(`/groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteGroup(id: string) {
  return request<void>(`/groups/${id}`, {
    method: 'DELETE',
  })
}

export async function addMonitorsToGroup(groupId: string, monitorIds: string[]) {
  return request<MonitorGroup>(`/groups/${groupId}/monitors`, {
    method: 'POST',
    body: JSON.stringify({ monitorIds }),
  })
}

export async function removeMonitorsFromGroup(groupId: string, monitorIds: string[]) {
  return request<MonitorGroup>(`/groups/${groupId}/monitors`, {
    method: 'DELETE',
    body: JSON.stringify({ monitorIds }),
  })
}
