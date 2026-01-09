'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { MonitorInGroup, ApiError } from '@/lib/api'

export default function NewGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMonitors, setSelectedMonitors] = useState<string[]>([])
  const [availableMonitors, setAvailableMonitors] = useState<MonitorInGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMonitors, setLoadingMonitors] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAvailableMonitors()
  }, [])

  async function loadAvailableMonitors() {
    try {
      // Carrega monitores sem grupo
      const ungrouped = await api.getUngroupedMonitors()
      setAvailableMonitors(ungrouped)
    } catch (err) {
      console.error('Erro ao carregar monitores:', err)
    } finally {
      setLoadingMonitors(false)
    }
  }

  function toggleMonitor(monitorId: string) {
    setSelectedMonitors((prev) =>
      prev.includes(monitorId)
        ? prev.filter((id) => id !== monitorId)
        : [...prev, monitorId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.createGroup({
        name,
        description: description || undefined,
        monitorIds: selectedMonitors.length > 0 ? selectedMonitors : undefined,
      })
      router.push('/groups')
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.error || 'Erro ao criar grupo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/groups"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Grupos
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-white mb-8">Novo Grupo</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nome */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
            Nome do Grupo *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ex: API Principal"
            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Descrição */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-2">
            Descrição
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional do grupo..."
            rows={3}
            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Monitores */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Monitores
          </label>
          {loadingMonitors ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                Carregando monitores...
              </div>
            </div>
          ) : availableMonitors.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-500 text-sm">
              Todos os monitores já estão em grupos ou não há monitores disponíveis.
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg divide-y divide-zinc-800 max-h-64 overflow-y-auto">
              {availableMonitors.map((monitor) => (
                <label
                  key={monitor.id}
                  className="flex items-center gap-3 p-3 hover:bg-zinc-800/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedMonitors.includes(monitor.id)}
                    onChange={() => toggleMonitor(monitor.id)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{monitor.name}</p>
                    <p className="text-zinc-500 text-xs truncate">{monitor.url}</p>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      monitor.currentStatus === 'up'
                        ? 'bg-emerald-500'
                        : monitor.currentStatus === 'down'
                          ? 'bg-red-500'
                          : 'bg-zinc-500'
                    }`}
                  />
                </label>
              ))}
            </div>
          )}
          {selectedMonitors.length > 0 && (
            <p className="text-zinc-500 text-sm mt-2">
              {selectedMonitors.length} {selectedMonitors.length === 1 ? 'monitor selecionado' : 'monitores selecionados'}
            </p>
          )}
        </div>

        {/* Botões */}
        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Criando...' : 'Criar Grupo'}
          </button>
          <Link
            href="/groups"
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
