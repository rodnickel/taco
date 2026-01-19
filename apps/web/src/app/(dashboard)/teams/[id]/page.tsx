'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { Team, ApiError } from '@/lib/api'
import { useTeam, useTeamPermission } from '@/contexts/TeamContext'
import { ConfirmModal } from '@/components/ConfirmModal'

// Cores dos planos
const planColors: Record<string, { bg: string; text: string; border: string }> = {
  free: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  starter: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  pro: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  business: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
}

// Componente de barra de progresso de uso
function UsageBar({ current, limit, unlimited }: { current: number; limit: number; unlimited: boolean }) {
  if (unlimited) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500/50 rounded-full" style={{ width: '30%' }} />
        </div>
        <span className="text-xs text-zinc-500">{current} / ∞</span>
      </div>
    )
  }

  const percentage = limit > 0 ? (current / limit) * 100 : 0
  const barColor =
    percentage >= 100
      ? 'bg-red-500'
      : percentage >= 80
      ? 'bg-amber-500'
      : 'bg-emerald-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500">{current} / {limit}</span>
    </div>
  )
}

export default function TeamSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string
  const { refreshTeams, currentTeam, switchTeam, teams, usage } = useTeam()
  const { canAdmin } = useTeamPermission()

  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function loadTeam() {
      try {
        const data = await api.getTeam(teamId)
        setTeam(data)
        setName(data.name)
        setSlug(data.slug)
      } catch (err) {
        console.error('Erro ao carregar time:', err)
        setError('Erro ao carregar time')
      } finally {
        setLoading(false)
      }
    }

    loadTeam()
  }, [teamId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      await api.updateTeam(teamId, { name, slug })
      setSuccess('Time atualizado com sucesso!')
      await refreshTeams()
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.details && apiError.details.length > 0) {
        setError(apiError.details.map((d) => d.message).join('. '))
      } else {
        setError(apiError.error || 'Erro ao atualizar time')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.deleteTeam(teamId)
      await refreshTeams()
      // Se deletou o time atual, troca para outro
      if (currentTeam?.id === teamId && teams.length > 1) {
        const nextTeam = teams.find((t) => t.id !== teamId)
        if (nextTeam) {
          switchTeam(nextTeam.id)
        }
      }
      router.push('/dashboard')
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.error || 'Erro ao deletar time')
      setShowDeleteModal(false)
    } finally {
      setDeleting(false)
    }
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

  return (
    <div className="p-8 max-w-2xl">
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
        <h1 className="text-2xl font-bold text-white">Configurações do Time</h1>
        <p className="text-zinc-400 mt-1">Gerencie as configurações do time {team.name}</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-8 border-b border-zinc-800">
        <Link
          href={`/teams/${teamId}`}
          className="pb-3 px-1 text-sm font-medium text-orange-400 border-b-2 border-orange-400"
        >
          Geral
        </Link>
        <Link
          href={`/teams/${teamId}/members`}
          className="pb-3 px-1 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          {/* Nome */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
              Nome do Time
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              disabled={!canAdmin}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-zinc-300 mb-2">
              Identificador (slug)
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              required
              maxLength={30}
              pattern="[a-z0-9-]+"
              disabled={!canAdmin}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Info */}
          <div className="pt-4 border-t border-zinc-800 space-y-2 text-sm text-zinc-400">
            <p>
              <span className="text-zinc-500">Owner:</span>{' '}
              {team.owner.name || team.owner.email}
            </p>
            <p>
              <span className="text-zinc-500">Criado em:</span>{' '}
              {new Date(team.createdAt).toLocaleDateString('pt-BR')}
            </p>
            <p>
              <span className="text-zinc-500">Membros:</span> {team.members.length}
            </p>
            <p>
              <span className="text-zinc-500">Monitors:</span> {team._count?.monitors || 0}
            </p>
          </div>
        </div>

        {/* Buttons */}
        {canAdmin && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Deletar time
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar alterações'
              )}
            </button>
          </div>
        )}
      </form>

      {/* Seção de Plano e Uso */}
      {usage && (
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          {/* Header do Plano */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Plano Atual</h2>
              <p className="text-sm text-zinc-400 mt-1">Gerencie seu plano e visualize o uso de recursos</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 text-sm font-medium rounded-lg border ${planColors[usage.plan.slug]?.bg || planColors.free.bg} ${planColors[usage.plan.slug]?.text || planColors.free.text} ${planColors[usage.plan.slug]?.border || planColors.free.border}`}>
                {usage.plan.name}
              </span>
              {usage.plan.slug !== 'business' && (
                <Link
                  href="/pricing"
                  className="px-3 py-1 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg transition-all"
                >
                  Upgrade
                </Link>
              )}
            </div>
          </div>

          {/* Uso de Recursos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-zinc-800">
            {/* Monitores */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                <span className="text-sm font-medium text-zinc-300">Monitores</span>
              </div>
              <UsageBar
                current={usage.usage.monitors.current}
                limit={usage.usage.monitors.limit}
                unlimited={usage.usage.monitors.unlimited}
              />
            </div>

            {/* Status Pages */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
                <span className="text-sm font-medium text-zinc-300">Status Pages</span>
              </div>
              <UsageBar
                current={usage.usage.statusPages.current}
                limit={usage.usage.statusPages.limit}
                unlimited={usage.usage.statusPages.unlimited}
              />
            </div>

            {/* Membros */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <span className="text-sm font-medium text-zinc-300">Membros</span>
              </div>
              <UsageBar
                current={usage.usage.members.current}
                limit={usage.usage.members.limit}
                unlimited={usage.usage.members.unlimited}
              />
            </div>
          </div>

          {/* Limites do Plano */}
          <div className="pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">Recursos do plano</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-1">Intervalo mínimo</p>
                <p className="text-sm font-medium text-white">
                  {usage.limits.minIntervalSeconds >= 60
                    ? `${usage.limits.minIntervalSeconds / 60} min`
                    : `${usage.limits.minIntervalSeconds} seg`}
                </p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-1">Histórico</p>
                <p className="text-sm font-medium text-white">
                  {usage.limits.historyDays >= 365
                    ? '1 ano'
                    : `${usage.limits.historyDays} dias`}
                </p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-zinc-500 mb-1">Canais de alerta</p>
                <div className="flex flex-wrap gap-1">
                  {usage.limits.allowedChannels.map((channel) => (
                    <span
                      key={channel}
                      className="px-2 py-0.5 text-xs bg-zinc-700 text-zinc-300 rounded capitalize"
                    >
                      {channel}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Deletar time"
        message={`Tem certeza que deseja deletar o time "${team.name}"? Esta ação não pode ser desfeita e todos os monitores, alertas e status pages serão perdidos.`}
        confirmText={deleting ? 'Deletando...' : 'Deletar'}
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
