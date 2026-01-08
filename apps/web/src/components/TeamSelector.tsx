'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useTeam } from '@/contexts/TeamContext'

// ============================================
// Componente de Seleção de Time
// ============================================

function ChevronUpDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function CogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

export default function TeamSelector() {
  const { currentTeam, teams, switchTeam, loading, userRole } = useTeam()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fecha o dropdown quando clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fecha o dropdown ao pressionar Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="px-3 py-2">
        <Link
          href="/teams/new"
          className="flex items-center gap-2 px-3 py-2.5 bg-orange-500/10 text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-500/20 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Criar Time
        </Link>
      </div>
    )
  }

  const roleLabels: Record<string, string> = {
    ADMIN: 'Admin',
    EDITOR: 'Editor',
    VIEWER: 'Viewer',
  }

  return (
    <div className="px-3 py-2" ref={dropdownRef}>
      {/* Botão do seletor */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold text-xs">
            {currentTeam?.name?.[0]?.toUpperCase() || 'T'}
          </span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-white truncate">
            {currentTeam?.name || 'Selecione um time'}
          </p>
          {userRole && (
            <p className="text-xs text-zinc-500">{roleLabels[userRole] || userRole}</p>
          )}
        </div>
        <ChevronUpDownIcon className="w-5 h-5 text-zinc-500 flex-shrink-0" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-3 right-3 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Lista de times */}
          <div className="max-h-64 overflow-y-auto py-1">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => {
                  switchTeam(team.id)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-700/50 transition-colors ${
                  team.id === currentTeam?.id ? 'bg-zinc-700/30' : ''
                }`}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">
                    {team.name?.[0]?.toUpperCase() || 'T'}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-white truncate">{team.name}</p>
                  <p className="text-xs text-zinc-500">{team._count?.monitors || 0} monitors</p>
                </div>
                {team.id === currentTeam?.id && (
                  <CheckIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Separador */}
          <div className="border-t border-zinc-700" />

          {/* Ações */}
          <div className="py-1">
            <Link
              href="/teams/new"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="text-sm">Criar novo time</span>
            </Link>

            {currentTeam && (
              <>
                <Link
                  href={`/teams/${currentTeam.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-colors"
                >
                  <CogIcon className="w-5 h-5" />
                  <span className="text-sm">Configuracoes do time</span>
                </Link>

                <Link
                  href={`/teams/${currentTeam.id}/members`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-colors"
                >
                  <UsersIcon className="w-5 h-5" />
                  <span className="text-sm">Gerenciar membros</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
