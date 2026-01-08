'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { ApiError } from '@/lib/api'

export default function NewMonitorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState<'GET' | 'POST' | 'HEAD'>('GET')
  const [intervalSeconds, setIntervalSeconds] = useState(300)
  const [timeout, setTimeout] = useState(30)
  const [expectedStatus, setExpectedStatus] = useState(200)
  const [checkSsl, setCheckSsl] = useState(true)
  const [alertsEnabled, setAlertsEnabled] = useState(true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.createMonitor({
        name,
        url,
        method,
        intervalSeconds,
        timeout,
        expectedStatus,
        checkSsl,
        alertsEnabled,
      })

      router.push('/monitors')
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.details && apiError.details.length > 0) {
        setError(apiError.details.map((d) => d.message).join('. '))
      } else {
        setError(apiError.error || 'Erro ao criar monitor')
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
          href="/monitors"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Monitors
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Novo Monitor</h1>
        <p className="text-zinc-400 mt-1">Configure um novo monitor de uptime</p>
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
              Nome
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="Meu Site"
            />
          </div>

          {/* URL */}
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-zinc-300 mb-2">
              URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="https://exemplo.com"
            />
          </div>

          {/* Method e Expected Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="method" className="block text-sm font-medium text-zinc-300 mb-2">
                Método HTTP
              </label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value as 'GET' | 'POST' | 'HEAD')}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>

            <div>
              <label htmlFor="expectedStatus" className="block text-sm font-medium text-zinc-300 mb-2">
                Status esperado
              </label>
              <input
                id="expectedStatus"
                type="number"
                value={expectedStatus}
                onChange={(e) => setExpectedStatus(Number(e.target.value))}
                min={100}
                max={599}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Interval e Timeout */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="interval" className="block text-sm font-medium text-zinc-300 mb-2">
                Intervalo (segundos)
              </label>
              <input
                id="interval"
                type="number"
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                min={5}
                max={3600}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
              <p className="text-xs text-zinc-500 mt-1">Mín: 5s, Máx: 3600s</p>
            </div>

            <div>
              <label htmlFor="timeout" className="block text-sm font-medium text-zinc-300 mb-2">
                Timeout (segundos)
              </label>
              <input
                id="timeout"
                type="number"
                value={timeout}
                onChange={(e) => setTimeout(Number(e.target.value))}
                min={5}
                max={60}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
              <p className="text-xs text-zinc-500 mt-1">Mín: 5s, Máx: 60s</p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                id="checkSsl"
                type="checkbox"
                checked={checkSsl}
                onChange={(e) => setCheckSsl(e.target.checked)}
                className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
              />
              <label htmlFor="checkSsl" className="text-sm text-zinc-300">
                Verificar certificado SSL
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="alertsEnabled"
                type="checkbox"
                checked={alertsEnabled}
                onChange={(e) => setAlertsEnabled(e.target.checked)}
                className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
              />
              <label htmlFor="alertsEnabled" className="text-sm text-zinc-300">
                Enviar alertas quando o status mudar
              </label>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/monitors"
            className="px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Monitor'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
