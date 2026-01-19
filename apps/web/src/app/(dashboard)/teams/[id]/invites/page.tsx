'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { Team, TeamInvite, TeamRole, ApiError } from '@/lib/api'
import { useTeamPermission, useTeam } from '@/contexts/TeamContext'
import { ConfirmModal } from '@/components/ConfirmModal'

export default function TeamInvitesPage() {
  const params = useParams()
  const teamId = params.id as string
  const { canAdmin } = useTeamPermission()
  const { usage } = useTeam()

  // Verifica se atingiu o limite de membros
  const memberLimitReached = usage && !usage.usage.members.unlimited &&
    usage.usage.members.current >= usage.usage.members.limit

  const [team, setTeam] = useState<Team | null>(null)
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamRole>('VIEWER')
  const [inviteMaxUses, setInviteMaxUses] = useState(1)
  const [inviteType, setInviteType] = useState<'email' | 'link'>('link')

  // Revoke state
  const [inviteToRevoke, setInviteToRevoke] = useState<TeamInvite | null>(null)
  const [revoking, setRevoking] = useState(false)

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [teamData, invitesData] = await Promise.all([
          api.getTeam(teamId),
          api.getTeamInvites(teamId),
        ])
        setTeam(teamData)
        setInvites(invitesData)
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        setError('Erro ao carregar convites')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [teamId])

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError('')
    setSuccess('')

    try {
      const newInvite = await api.createInvite(teamId, {
        email: inviteType === 'email' ? inviteEmail : undefined,
        role: inviteRole,
        maxUses: inviteType === 'link' ? inviteMaxUses : 1,
        expiresInDays: 7,
      })
      setInvites((prev) => [newInvite, ...prev])
      setSuccess(inviteType === 'email' ? 'Convite criado! O link foi enviado.' : 'Link de convite criado!')
      setShowForm(false)
      setInviteEmail('')
      setInviteRole('VIEWER')
      setInviteMaxUses(1)
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.error || 'Erro ao criar convite')
    } finally {
      setCreating(false)
    }
  }

  async function handleRevokeInvite() {
    if (!inviteToRevoke) return

    setRevoking(true)
    setError('')

    try {
      await api.revokeInvite(teamId, inviteToRevoke.id)
      setInvites((prev) => prev.filter((i) => i.id !== inviteToRevoke.id))
      setSuccess('Convite revogado com sucesso!')
      setInviteToRevoke(null)
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.error || 'Erro ao revogar convite')
    } finally {
      setRevoking(false)
    }
  }

  function copyInviteLink(invite: TeamInvite) {
    const link = `${window.location.origin}/invite/${invite.token}`
    navigator.clipboard.writeText(link)
    setCopiedId(invite.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const roleLabels: Record<TeamRole, string> = {
    ADMIN: 'Administrador',
    EDITOR: 'Editor',
    VIEWER: 'Visualizador',
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
          Time não encontrado
        </div>
      </div>
    )
  }

  if (!canAdmin) {
    return (
      <div className="p-8">
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-lg">
          Você não tem permissão para gerenciar convites
        </div>
      </div>
    )
  }

  const activeInvites = invites.filter((i) => {
    const isExpired = new Date(i.expiresAt) < new Date()
    const isUsedUp = i.maxUses > 0 && i.useCount >= i.maxUses
    return !isExpired && !isUsedUp && !i.usedAt
  })

  const expiredInvites = invites.filter((i) => {
    const isExpired = new Date(i.expiresAt) < new Date()
    const isUsedUp = i.maxUses > 0 && i.useCount >= i.maxUses
    return isExpired || isUsedUp || i.usedAt
  })

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Convites</h1>
          <p className="text-zinc-400 mt-1">Gerencie os convites do time {team.name}</p>
        </div>
        {!showForm && !memberLimitReached && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Criar convite
          </button>
        )}
      </div>

      {/* Limite de membros atingido */}
      {memberLimitReached && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-amber-400 font-medium">Limite de membros atingido</h3>
              <p className="text-amber-400/80 text-sm mt-1">
                Você atingiu o limite de {usage?.usage.members.limit} membro{usage?.usage.members.limit !== 1 ? 's' : ''} do plano {usage?.plan.name}.
                Faça upgrade para convidar mais pessoas.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 mt-3 text-sm text-amber-400 hover:text-amber-300 font-medium"
              >
                Ver planos
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

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
          className="pb-3 px-1 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
        >
          Membros
        </Link>
        <Link
          href={`/teams/${teamId}/invites`}
          className="pb-3 px-1 text-sm font-medium text-orange-400 border-b-2 border-orange-400"
        >
          Convites
        </Link>
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

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreateInvite} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Novo Convite</h3>

          {/* Type Selector */}
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setInviteType('link')}
              className={`flex-1 p-4 rounded-lg border text-left transition-colors ${
                inviteType === 'link'
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
              }`}
            >
              <p className={`font-medium ${inviteType === 'link' ? 'text-orange-400' : 'text-white'}`}>
                Link de convite
              </p>
              <p className="text-xs text-zinc-500 mt-1">Qualquer pessoa com o link pode entrar</p>
            </button>
            <button
              type="button"
              onClick={() => setInviteType('email')}
              className={`flex-1 p-4 rounded-lg border text-left transition-colors ${
                inviteType === 'email'
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
              }`}
            >
              <p className={`font-medium ${inviteType === 'email' ? 'text-orange-400' : 'text-white'}`}>
                Convite por email
              </p>
              <p className="text-xs text-zinc-500 mt-1">Apenas o email especificado pode aceitar</p>
            </button>
          </div>

          {/* Email Field */}
          {inviteType === 'email' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                placeholder="email@exemplo.com"
              />
            </div>
          )}

          {/* Max Uses (only for link) */}
          {inviteType === 'link' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Número máximo de usos
              </label>
              <input
                type="number"
                value={inviteMaxUses}
                onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                min={0}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
              <p className="text-xs text-zinc-500 mt-1">0 = ilimitado</p>
            </div>
          )}

          {/* Role */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Permissão
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as TeamRole)}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            >
              <option value="VIEWER">Visualizador - Apenas visualização</option>
              <option value="EDITOR">Editor - Cria e edita recursos</option>
              <option value="ADMIN">Administrador - Gerencia o time</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating || (inviteType === 'email' && !inviteEmail)}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar convite'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Active Invites */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Convites ativos ({activeInvites.length})</h3>
        {activeInvites.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-400">Nenhum convite ativo</p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
            {activeInvites.map((invite) => (
              <div key={invite.id} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {invite.email ? (
                      <p className="text-sm font-medium text-white">{invite.email}</p>
                    ) : (
                      <p className="text-sm font-medium text-white">Link de convite</p>
                    )}
                    <span className="px-2 py-0.5 text-xs bg-zinc-700 text-zinc-300 rounded">
                      {roleLabels[invite.role]}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Criado por {invite.invitedBy.name || invite.invitedBy.email} -
                    Expira em {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}
                    {invite.maxUses > 0 && ` - ${invite.useCount}/${invite.maxUses} usos`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyInviteLink(invite)}
                    className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    {copiedId === invite.id ? 'Copiado!' : 'Copiar link'}
                  </button>
                  <button
                    onClick={() => setInviteToRevoke(invite)}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Revogar convite"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expired/Used Invites */}
      {expiredInvites.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Convites expirados/usados ({expiredInvites.length})</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800 opacity-60">
            {expiredInvites.slice(0, 5).map((invite) => (
              <div key={invite.id} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {invite.email ? (
                      <p className="text-sm text-zinc-400">{invite.email}</p>
                    ) : (
                      <p className="text-sm text-zinc-400">Link de convite</p>
                    )}
                    <span className="px-2 py-0.5 text-xs bg-zinc-700 text-zinc-400 rounded">
                      {roleLabels[invite.role]}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600">
                    {invite.usedAt
                      ? `Usado em ${new Date(invite.usedAt).toLocaleDateString('pt-BR')}`
                      : invite.maxUses > 0 && invite.useCount >= invite.maxUses
                      ? 'Limite de usos atingido'
                      : 'Expirado'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      <ConfirmModal
        isOpen={!!inviteToRevoke}
        onCancel={() => setInviteToRevoke(null)}
        onConfirm={handleRevokeInvite}
        title="Revogar convite"
        message="Tem certeza que deseja revogar este convite? O link não poderá mais ser usado."
        confirmText={revoking ? 'Revogando...' : 'Revogar'}
        confirmVariant="danger"
        loading={revoking}
      />
    </div>
  )
}
