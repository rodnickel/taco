'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { PublicInviteInfo, ApiError, TeamRole } from '@/lib/api'

export default function AcceptInvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [invite, setInvite] = useState<PublicInviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Verifica se o usuario esta logado
    const storedToken = localStorage.getItem('token')
    setIsLoggedIn(!!storedToken)

    async function loadInvite() {
      try {
        const data = await api.getInviteInfo(token)
        setInvite(data)
      } catch (err) {
        const apiError = err as ApiError
        setError(apiError.error || 'Convite nao encontrado ou expirado')
      } finally {
        setLoading(false)
      }
    }

    loadInvite()
  }, [token])

  async function handleAccept() {
    if (!isLoggedIn) {
      // Salva o token do convite e redireciona para login
      localStorage.setItem('pendingInvite', token)
      router.push('/login')
      return
    }

    setAccepting(true)
    setError('')

    try {
      const result = await api.acceptInvite(token)
      // Define o novo time como atual
      api.setCurrentTeamId(result.teamId)
      router.push('/dashboard')
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.error || 'Erro ao aceitar convite')
    } finally {
      setAccepting(false)
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400">Carregando...</span>
        </div>
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Convite invalido</h1>
            <p className="text-zinc-400 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
            >
              Voltar para o inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!invite) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo-taco.png" alt="Taco" className="h-10" />
            <span className="text-xl font-semibold text-white font-display">Taco</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Voce foi convidado!</h1>
            <p className="text-zinc-400">
              {invite.invitedByName || invite.invitedByEmail} convidou voce para participar do time
            </p>
          </div>

          {/* Team Info */}
          <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {invite.teamName[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-white">{invite.teamName}</p>
                <p className="text-sm text-zinc-500">@{invite.teamSlug}</p>
              </div>
            </div>

            <div className="border-t border-zinc-700 pt-4">
              <p className="text-sm text-zinc-400 mb-1">Sua permissao:</p>
              <p className="font-medium text-white">{roleLabels[invite.role]}</p>
              <p className="text-xs text-zinc-500">{roleDescriptions[invite.role]}</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          {/* Expiration Warning */}
          <p className="text-xs text-zinc-500 text-center mb-6">
            Este convite expira em {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Aceitando...
                </>
              ) : isLoggedIn ? (
                'Aceitar convite'
              ) : (
                'Entrar e aceitar convite'
              )}
            </button>

            {!isLoggedIn && (
              <p className="text-xs text-zinc-500 text-center">
                Nao tem uma conta?{' '}
                <Link
                  href={`/register?invite=${token}`}
                  className="text-orange-400 hover:text-orange-300"
                >
                  Criar conta
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
