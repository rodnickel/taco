'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { ApiError } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.login(email, password)
      localStorage.setItem('token', response.token)

      // Verifica se ha um convite pendente
      const pendingInvite = localStorage.getItem('pendingInvite')
      if (pendingInvite) {
        localStorage.removeItem('pendingInvite')
        try {
          const result = await api.acceptInvite(pendingInvite)
          api.setCurrentTeamId(result.teamId)
        } catch {
          // Se falhar ao aceitar o convite, continua normalmente
          console.error('Erro ao aceitar convite pendente')
        }
      }

      router.push('/dashboard')
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.error || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo-taco.png" alt="Taco" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white font-display">Taco</h1>
          <p className="text-zinc-400 mt-1">Entre na sua conta</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="********"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>

          {/* Register link */}
          <p className="text-center text-sm text-zinc-400">
            Não tem uma conta?{' '}
            <Link href="/register" className="text-orange-400 hover:text-orange-300 font-medium">
              Criar conta
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
