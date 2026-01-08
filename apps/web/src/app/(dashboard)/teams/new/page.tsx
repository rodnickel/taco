'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { ApiError } from '@/lib/api'
import { useTeam } from '@/contexts/TeamContext'

export default function NewTeamPage() {
  const router = useRouter()
  const { refreshTeams } = useTeam()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  // Gera slug automaticamente a partir do nome
  function handleNameChange(value: string) {
    setName(value)
    // Gera slug se o usuário não tiver editado manualmente
    const generatedSlug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por -
      .replace(/^-|-$/g, '') // Remove - do inicio e fim
    setSlug(generatedSlug)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const team = await api.createTeam({ name, slug })
      // Atualiza a lista de times no contexto
      await refreshTeams()
      // Define o novo time como atual
      api.setCurrentTeamId(team.id)
      router.push('/dashboard')
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.details && apiError.details.length > 0) {
        setError(apiError.details.map((d) => d.message).join('. '))
      } else {
        setError(apiError.error || 'Erro ao criar time')
      }
    } finally {
      setLoading(false)
    }
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
        <h1 className="text-2xl font-bold text-white">Novo Time</h1>
        <p className="text-zinc-400 mt-1">Crie um novo time para organizar seus monitores</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

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
              onChange={(e) => handleNameChange(e.target.value)}
              required
              maxLength={50}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="Minha Empresa"
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
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="minha-empresa"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Apenas letras minusculas, numeros e hifens. Deve ser unico.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || !name || !slug}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Time'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
