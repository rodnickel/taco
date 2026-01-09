'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { ApiError, RequestHeader } from '@/lib/api'

export default function EditMonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Campos básicos
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'>('GET')
  const [intervalSeconds, setIntervalSeconds] = useState(180)
  const [timeout, setTimeout] = useState(30)
  const [expectedStatus, setExpectedStatus] = useState(200)
  const [checkSsl, setCheckSsl] = useState(true)
  const [active, setActive] = useState(true)
  const [alertsEnabled, setAlertsEnabled] = useState(true)

  // Campos avançados
  const [recoveryPeriod, setRecoveryPeriod] = useState(180)
  const [confirmationPeriod, setConfirmationPeriod] = useState(0)
  const [followRedirects, setFollowRedirects] = useState(true)
  const [requestBody, setRequestBody] = useState('')
  const [headers, setHeaders] = useState<RequestHeader[]>([])

  useEffect(() => {
    loadMonitor()
  }, [id])

  function addHeader() {
    setHeaders([...headers, { key: '', value: '' }])
  }

  function removeHeader(index: number) {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  function updateHeader(index: number, field: 'key' | 'value', value: string) {
    const newHeaders = [...headers]
    newHeaders[index][field] = value
    setHeaders(newHeaders)
  }

  async function loadMonitor() {
    try {
      const monitor = await api.getMonitor(id)
      setName(monitor.name)
      setUrl(monitor.url)
      setMethod(monitor.method as typeof method)
      setIntervalSeconds(monitor.intervalSeconds)
      setTimeout(monitor.timeout)
      setExpectedStatus(monitor.expectedStatus)
      setCheckSsl(monitor.checkSsl)
      setActive(monitor.active)
      setAlertsEnabled(monitor.alertsEnabled)
      // Campos avançados
      setRecoveryPeriod(monitor.recoveryPeriod ?? 180)
      setConfirmationPeriod(monitor.confirmationPeriod ?? 0)
      setFollowRedirects(monitor.followRedirects ?? true)
      setRequestBody(monitor.requestBody || '')
      setHeaders(monitor.requestHeaders || [])
      // Abre a seção avançada se houver configurações personalizadas
      if (monitor.requestBody || (monitor.requestHeaders && monitor.requestHeaders.length > 0) || monitor.confirmationPeriod > 0) {
        setShowAdvanced(true)
      }
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === 'UNAUTHORIZED') {
        router.push('/login')
        return
      }
      setError(apiError.error || 'Erro ao carregar monitor')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Filtra headers vazios
      const validHeaders = headers.filter(h => h.key.trim() !== '')

      await api.updateMonitor(id, {
        name,
        url,
        method,
        intervalSeconds,
        timeout,
        expectedStatus,
        checkSsl,
        active,
        alertsEnabled,
        recoveryPeriod,
        confirmationPeriod,
        followRedirects,
        requestBody: requestBody.trim() || null,
        requestHeaders: validHeaders.length > 0 ? validHeaders : null,
      })

      router.push(`/monitors/${id}`)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.details && apiError.details.length > 0) {
        setError(apiError.details.map((d) => d.message).join('. '))
      } else {
        setError(apiError.error || 'Erro ao atualizar monitor')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400">Carregando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href={`/monitors/${id}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Detalhes do Monitor
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Editar Monitor</h1>
        <p className="text-zinc-400 mt-1">Atualize as configurações do monitor</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Configurações Básicas */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Configurações Básicas</h2>

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
                onChange={(e) => setMethod(e.target.value as typeof method)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
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
                Frequência de verificação
              </label>
              <select
                id="interval"
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              >
                <option value={30}>30 segundos</option>
                <option value={60}>1 minuto</option>
                <option value={180}>3 minutos</option>
                <option value={300}>5 minutos</option>
                <option value={600}>10 minutos</option>
                <option value={900}>15 minutos</option>
                <option value={1800}>30 minutos</option>
                <option value={3600}>1 hora</option>
              </select>
            </div>

            <div>
              <label htmlFor="timeout" className="block text-sm font-medium text-zinc-300 mb-2">
                Timeout da requisição
              </label>
              <select
                id="timeout"
                value={timeout}
                onChange={(e) => setTimeout(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              >
                <option value={5}>5 segundos</option>
                <option value={10}>10 segundos</option>
                <option value={15}>15 segundos</option>
                <option value={30}>30 segundos</option>
                <option value={60}>60 segundos</option>
              </select>
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
                id="active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
              />
              <label htmlFor="active" className="text-sm text-zinc-300">
                Monitor ativo
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

        {/* Configurações Avançadas */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
          >
            <span className="text-lg font-semibold text-white">Configurações Avançadas</span>
            <svg
              className={`w-5 h-5 text-zinc-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="px-6 pb-6 space-y-6 border-t border-zinc-800 pt-6">
              {/* Recovery e Confirmation Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="recoveryPeriod" className="block text-sm font-medium text-zinc-300 mb-2">
                    Período de recuperação
                  </label>
                  <select
                    id="recoveryPeriod"
                    value={recoveryPeriod}
                    onChange={(e) => setRecoveryPeriod(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  >
                    <option value={0}>Imediato</option>
                    <option value={60}>1 minuto</option>
                    <option value={180}>3 minutos</option>
                    <option value={300}>5 minutos</option>
                    <option value={600}>10 minutos</option>
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">Tempo UP para considerar recuperado</p>
                </div>

                <div>
                  <label htmlFor="confirmationPeriod" className="block text-sm font-medium text-zinc-300 mb-2">
                    Período de confirmação
                  </label>
                  <select
                    id="confirmationPeriod"
                    value={confirmationPeriod}
                    onChange={(e) => setConfirmationPeriod(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  >
                    <option value={0}>Imediato (1 falha)</option>
                    <option value={1}>2 falhas consecutivas</option>
                    <option value={2}>3 falhas consecutivas</option>
                    <option value={3}>4 falhas consecutivas</option>
                    <option value={5}>6 falhas consecutivas</option>
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">Falhas antes de marcar como DOWN</p>
                </div>
              </div>

              {/* Follow Redirects */}
              <div className="flex items-center gap-3">
                <input
                  id="followRedirects"
                  type="checkbox"
                  checked={followRedirects}
                  onChange={(e) => setFollowRedirects(e.target.checked)}
                  className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
                />
                <label htmlFor="followRedirects" className="text-sm text-zinc-300">
                  Seguir redirecionamentos HTTP
                </label>
              </div>

              {/* Request Body */}
              <div>
                <label htmlFor="requestBody" className="block text-sm font-medium text-zinc-300 mb-2">
                  Request Body
                  {!['POST', 'PUT', 'PATCH'].includes(method) && (
                    <span className="text-zinc-500 font-normal ml-2">(disponível para POST, PUT, PATCH)</span>
                  )}
                </label>
                <textarea
                  id="requestBody"
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  rows={4}
                  disabled={!['POST', 'PUT', 'PATCH'].includes(method)}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder='{"key": "value"}'
                />
                <p className="text-xs text-zinc-500 mt-1">JSON ou form-urlencoded</p>
              </div>

              {/* Request Headers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-zinc-300">
                    Headers customizados
                  </label>
                  <button
                    type="button"
                    onClick={addHeader}
                    className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    + Adicionar header
                  </button>
                </div>

                {headers.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nenhum header customizado</p>
                ) : (
                  <div className="space-y-2">
                    {headers.map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={header.key}
                          onChange={(e) => updateHeader(index, 'key', e.target.value)}
                          placeholder="Header name"
                          className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 text-sm"
                        />
                        <input
                          type="text"
                          value={header.value}
                          onChange={(e) => updateHeader(index, 'value', e.target.value)}
                          placeholder="Value"
                          className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeHeader(index)}
                          className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/monitors/${id}`}
            className="px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </Link>
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
              'Salvar Alterações'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
