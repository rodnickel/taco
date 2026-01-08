'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { Team, ApiError } from '@/lib/api'
import { useTeam, useTeamPermission } from '@/contexts/TeamContext'
import { ConfirmModal } from '@/components/ConfirmModal'

export default function TeamSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string
  const { refreshTeams, currentTeam, switchTeam, teams } = useTeam()
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
          Time nao encontrado
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
        <h1 className="text-2xl font-bold text-white">Configuracoes do Time</h1>
        <p className="text-zinc-400 mt-1">Gerencie as configuracoes do time {team.name}</p>
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
                'Salvar alteracoes'
              )}
            </button>
          </div>
        )}
      </form>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Deletar time"
        message={`Tem certeza que deseja deletar o time "${team.name}"? Esta acao nao pode ser desfeita e todos os monitores, alertas e status pages serao perdidos.`}
        confirmText={deleting ? 'Deletando...' : 'Deletar'}
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
