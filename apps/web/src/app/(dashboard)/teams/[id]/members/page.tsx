'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { Team, TeamMember, TeamRole, ApiError } from '@/lib/api'
import { useTeam, useTeamPermission } from '@/contexts/TeamContext'
import { ConfirmModal } from '@/components/ConfirmModal'

export default function TeamMembersPage() {
  const params = useParams()
  const teamId = params.id as string
  const { refreshTeams } = useTeam()
  const { canAdmin } = useTeamPermission()

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)
  const [removing, setRemoving] = useState(false)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [teamData, membersData] = await Promise.all([
          api.getTeam(teamId),
          api.getTeamMembers(teamId),
        ])
        setTeam(teamData)
        setMembers(membersData)
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        setError('Erro ao carregar dados do time')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [teamId])

  async function handleRoleChange(userId: string, newRole: TeamRole) {
    setUpdatingRole(userId)
    setError('')
    setSuccess('')

    try {
      await api.updateMemberRole(teamId, userId, newRole)
      setMembers((prev) =>
        prev.map((m) => (m.user.id === userId ? { ...m, role: newRole } : m))
      )
      setSuccess('Permissao atualizada com sucesso!')
      await refreshTeams()
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.error || 'Erro ao atualizar permissao')
    } finally {
      setUpdatingRole(null)
    }
  }

  async function handleRemoveMember() {
    if (!memberToRemove) return

    setRemoving(true)
    setError('')

    try {
      await api.removeMember(teamId, memberToRemove.user.id)
      setMembers((prev) => prev.filter((m) => m.user.id !== memberToRemove.user.id))
      setSuccess('Membro removido com sucesso!')
      setMemberToRemove(null)
      await refreshTeams()
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.error || 'Erro ao remover membro')
    } finally {
      setRemoving(false)
    }
  }

  const roleLabels: Record<TeamRole, string> = {
    ADMIN: 'Administrador',
    EDITOR: 'Editor',
    VIEWER: 'Visualizador',
  }

  const roleDescriptions: Record<TeamRole, string> = {
    ADMIN: 'Gerencia time, membros e recursos',
    EDITOR: 'Cria e edita monitors, alertas e status pages',
    VIEWER: 'Apenas visualizacao',
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400">Carregando...</span>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          Time nao encontrado
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Membros do Time</h1>
        <p className="text-zinc-400 mt-1">Gerencie os membros do time {team.name}</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-8 border-b border-zinc-800">
        <Link
          href={`/teams/${teamId}`}
          className="pb-3 px-1 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
        >
          Geral
        </Link>
        <Link
          href={`/teams/${teamId}/members`}
          className="pb-3 px-1 text-sm font-medium text-orange-400 border-b-2 border-orange-400"
        >
          Membros
        </Link>
        {canAdmin && (
          <Link
            href={`/teams/${teamId}/invites`}
            className="pb-3 px-1 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Convites
          </Link>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 px-4 py-3 rounded-lg text-sm mb-6">
          {success}
        </div>
      )}

      {/* Members List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="font-semibold text-white">{members.length} membros</h2>
        </div>

        <div className="divide-y divide-zinc-800">
          {members.map((member) => {
            const isOwner = member.user.id === team.ownerId
            return (
              <div
                key={member.id}
                className="p-4 flex items-center gap-4"
              >
                {/* Avatar */}
                <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-zinc-300">
                    {member.user.name?.[0]?.toUpperCase() || member.user.email[0].toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">
                      {member.user.name || member.user.email}
                    </p>
                    {isOwner && (
                      <span className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-400 rounded">
                        Owner
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{member.user.email}</p>
                </div>

                {/* Role */}
                <div className="flex items-center gap-4">
                  {canAdmin && !isOwner ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.user.id, e.target.value as TeamRole)}
                      disabled={updatingRole === member.user.id}
                      className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
                    >
                      <option value="ADMIN">{roleLabels.ADMIN}</option>
                      <option value="EDITOR">{roleLabels.EDITOR}</option>
                      <option value="VIEWER">{roleLabels.VIEWER}</option>
                    </select>
                  ) : (
                    <div className="text-right">
                      <p className="text-sm text-white">{roleLabels[member.role]}</p>
                      <p className="text-xs text-zinc-500">{roleDescriptions[member.role]}</p>
                    </div>
                  )}

                  {/* Remove Button */}
                  {canAdmin && !isOwner && (
                    <button
                      onClick={() => setMemberToRemove(member)}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remover membro"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Member CTA */}
      {canAdmin && (
        <div className="mt-6">
          <Link
            href={`/teams/${teamId}/invites`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
            Convidar membros
          </Link>
        </div>
      )}

      {/* Remove Modal */}
      <ConfirmModal
        isOpen={!!memberToRemove}
        onCancel={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remover membro"
        message={`Tem certeza que deseja remover "${memberToRemove?.user.name || memberToRemove?.user.email}" do time?`}
        confirmText={removing ? 'Removendo...' : 'Remover'}
        confirmVariant="danger"
        loading={removing}
      />
    </div>
  )
}
