'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import * as api from '@/lib/api'
import type { Team, TeamRole, TeamUsage } from '@/lib/api'

// ============================================
// Context de Times
// ============================================

interface TeamContextValue {
  currentTeam: Team | null
  teams: Team[]
  userRole: TeamRole | null
  usage: TeamUsage | null
  loading: boolean
  error: string | null
  switchTeam: (teamId: string) => void
  refreshTeams: () => Promise<void>
  refreshUsage: () => Promise<void>
}

const TeamContext = createContext<TeamContextValue | undefined>(undefined)

interface TeamProviderProps {
  children: ReactNode
}

export function TeamProvider({ children }: TeamProviderProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [userRole, setUserRole] = useState<TeamRole | null>(null)
  const [usage, setUsage] = useState<TeamUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carrega o uso/limites do time atual
  const loadUsage = useCallback(async (teamId: string) => {
    try {
      const usageData = await api.getTeamUsage(teamId)
      setUsage(usageData)
    } catch (err) {
      console.error('Erro ao carregar uso do time:', err)
      // Não bloqueia se falhar - é informação secundária
    }
  }, [])

  // Carrega os times do usuário
  const loadTeams = useCallback(async () => {
    try {
      setError(null)
      const teamsData = await api.getTeams()
      setTeams(teamsData)

      // Se não houver times, limpa o estado
      if (teamsData.length === 0) {
        setCurrentTeam(null)
        setUserRole(null)
        setUsage(null)
        api.setCurrentTeamId('')
        return
      }

      // Verifica se há um time salvo no localStorage
      const savedTeamId = api.getCurrentTeamId()
      let teamToSelect = teamsData.find((t) => t.id === savedTeamId)

      // Se não encontrou o time salvo (ID inválido/antigo), limpa e usa o primeiro
      if (!teamToSelect) {
        // Limpa o ID inválido do storage antes de selecionar novo time
        localStorage.removeItem('currentTeamId')
        teamToSelect = teamsData[0]
      }

      setCurrentTeam(teamToSelect)
      api.setCurrentTeamId(teamToSelect.id)

      // Carrega uso/limites do time
      loadUsage(teamToSelect.id)

      // Encontra o role do usuário no time
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (token) {
        // Decodifica o JWT para pegar o userId (básico, sem validação)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const userId = payload.sub
          const member = teamToSelect.members.find((m) => m.user.id === userId)
          setUserRole(member?.role || null)
        } catch {
          setUserRole(null)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar times:', err)
      setError('Erro ao carregar times')
    } finally {
      setLoading(false)
    }
  }, [loadUsage])

  // Carrega times quando o componente monta
  useEffect(() => {
    // Só carrega se estiver autenticado
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
      loadTeams()
    } else {
      setLoading(false)
    }
  }, [loadTeams])

  // Troca o time atual
  const switchTeam = useCallback((teamId: string) => {
    const team = teams.find((t) => t.id === teamId)
    if (team) {
      setCurrentTeam(team)
      api.setCurrentTeamId(team.id)

      // Carrega uso/limites do novo time
      loadUsage(team.id)

      // Atualiza o role
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const userId = payload.sub
          const member = team.members.find((m) => m.user.id === userId)
          setUserRole(member?.role || null)
        } catch {
          setUserRole(null)
        }
      }
    }
  }, [teams, loadUsage])

  // Recarrega a lista de times
  const refreshTeams = useCallback(async () => {
    setLoading(true)
    await loadTeams()
  }, [loadTeams])

  // Recarrega o uso/limites do time atual
  const refreshUsage = useCallback(async () => {
    if (currentTeam) {
      await loadUsage(currentTeam.id)
    }
  }, [currentTeam, loadUsage])

  return (
    <TeamContext.Provider
      value={{
        currentTeam,
        teams,
        userRole,
        usage,
        loading,
        error,
        switchTeam,
        refreshTeams,
        refreshUsage,
      }}
    >
      {children}
    </TeamContext.Provider>
  )
}

// Hook para usar o contexto
export function useTeam() {
  const context = useContext(TeamContext)
  if (context === undefined) {
    throw new Error('useTeam deve ser usado dentro de um TeamProvider')
  }
  return context
}

// Hook para verificar permissões
export function useTeamPermission() {
  const { userRole } = useTeam()

  const canView = userRole !== null
  const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR'
  const canAdmin = userRole === 'ADMIN'

  return { canView, canEdit, canAdmin, role: userRole }
}
