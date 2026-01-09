'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import type { ApiError, Monitor, StatusPage, MonitorGroup, StatusPageGroupData } from '@/lib/api'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Tipos internos para gestão de seções
interface SectionData {
  id: string
  name: string
  displayOrder: number
  isNew?: boolean
}

interface MonitorSelection {
  monitorId: string
  displayName: string
  displayOrder: number
  sectionId: string | null
}

interface GroupSelection {
  groupId: string
  displayName: string
  displayOrder: number
  isExpanded: boolean
}

// Ícone de arrastar
function DragHandleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
    </svg>
  )
}

// Componente sortable para seções
function SortableSection({
  section,
  monitorCount,
  onNameChange,
  onRemove,
}: {
  section: SectionData
  monitorCount: number
  onNameChange: (id: string, name: string) => void
  onRemove: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-zinc-800 rounded-lg border border-zinc-700"
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1 text-zinc-400 hover:text-white cursor-grab active:cursor-grabbing"
        title="Arrastar para reordenar"
      >
        <DragHandleIcon className="w-5 h-5" />
      </button>

      {/* Section name */}
      <input
        type="text"
        value={section.name}
        onChange={(e) => onNameChange(section.id, e.target.value)}
        className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-600 rounded text-white focus:outline-none focus:border-orange-500"
      />

      {/* Monitor count */}
      <span className="text-sm text-zinc-400">
        {monitorCount} monitor(s)
      </span>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(section.id)}
        className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
        title="Remover seção"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>
  )
}

// Componente sortable para monitors
function SortableMonitorCard({
  monitor,
  selection,
  sections,
  onToggle,
  onDisplayNameChange,
  onSectionChange,
}: {
  monitor: Monitor
  selection: MonitorSelection
  sections: SectionData[]
  onToggle: (monitorId: string) => void
  onDisplayNameChange: (monitorId: string, displayName: string) => void
  onSectionChange: (monitorId: string, sectionId: string | null) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: selection.monitorId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/30"
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1 mt-1 text-zinc-400 hover:text-white cursor-grab active:cursor-grabbing"
        title="Arrastar para reordenar"
      >
        <DragHandleIcon className="w-5 h-5" />
      </button>

      <input
        type="checkbox"
        checked={true}
        onChange={() => onToggle(selection.monitorId)}
        className="w-4 h-4 mt-1.5 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
      />

      <div className="flex-1 space-y-2">
        <p className="text-white font-medium">{monitor.name}</p>
        <p className="text-xs text-zinc-500">{monitor.url}</p>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Display name */}
          <input
            type="text"
            value={selection.displayName}
            onChange={(e) => onDisplayNameChange(selection.monitorId, e.target.value)}
            placeholder="Nome customizado (opcional)"
            className="px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
          />

          {/* Section select */}
          <select
            value={selection.sectionId || ''}
            onChange={(e) => onSectionChange(selection.monitorId, e.target.value || null)}
            className="px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-orange-500"
          >
            <option value="">Sem seção</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

// Overlay para drag (aparência do item sendo arrastado)
function DragOverlayItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="opacity-90 shadow-xl">
      {children}
    </div>
  )
}

export default function EditStatusPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [statusPage, setStatusPage] = useState<StatusPage | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [originalSlug, setOriginalSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [primaryColor, setPrimaryColor] = useState('#10b981')
  const [backgroundColor, setBackgroundColor] = useState('#09090b')
  const [showUptime, setShowUptime] = useState(true)
  const [showLatency, setShowLatency] = useState(true)
  const [showHistory, setShowHistory] = useState(true)
  const [historyDays, setHistoryDays] = useState(90)

  // Sections and monitors state
  const [sections, setSections] = useState<SectionData[]>([])
  const [selectedMonitors, setSelectedMonitors] = useState<MonitorSelection[]>([])
  const [newSectionName, setNewSectionName] = useState('')

  // Groups state
  const [availableGroups, setAvailableGroups] = useState<MonitorGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<GroupSelection[]>([])

  // Drag state
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [activeMonitorId, setActiveMonitorId] = useState<string | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    try {
      const [statusPageData, monitorsData, groupsData, statusPageGroupsData] = await Promise.all([
        api.getStatusPage(id),
        api.getMonitors(),
        api.getGroups(),
        api.getStatusPageGroups(id),
      ])

      setStatusPage(statusPageData)
      setMonitors(monitorsData.monitors)
      setAvailableGroups(groupsData)

      // Load selected groups
      setSelectedGroups(
        statusPageGroupsData.groups.map((g) => ({
          groupId: g.groupId,
          displayName: g.displayName || '',
          displayOrder: g.displayOrder,
          isExpanded: g.isExpanded,
        }))
      )

      // Populate form
      setName(statusPageData.name)
      setSlug(statusPageData.slug)
      setOriginalSlug(statusPageData.slug)
      setDescription(statusPageData.description || '')
      setIsPublic(statusPageData.isPublic)
      setPrimaryColor(statusPageData.primaryColor)
      setBackgroundColor(statusPageData.backgroundColor)
      setShowUptime(statusPageData.showUptime)
      setShowLatency(statusPageData.showLatency)
      setShowHistory(statusPageData.showHistory)
      setHistoryDays(statusPageData.historyDays)

      // Load sections
      setSections(
        (statusPageData.sections || []).map((s) => ({
          id: s.id,
          name: s.name,
          displayOrder: s.displayOrder,
        }))
      )

      // Load monitors with section assignments
      setSelectedMonitors(
        statusPageData.monitors.map((m) => ({
          monitorId: m.monitor.id,
          displayName: m.displayName || '',
          displayOrder: m.displayOrder,
          sectionId: m.sectionId || null,
        }))
      )
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === 'UNAUTHORIZED') {
        router.push('/login')
        return
      }
      setError(apiError.error || 'Erro ao carregar dados')
    } finally {
      setLoadingData(false)
    }
  }

  // Check slug availability
  const checkSlug = useCallback(async (slugToCheck: string) => {
    if (!slugToCheck || slugToCheck.length < 3 || slugToCheck === originalSlug) {
      setSlugError('')
      return
    }

    try {
      const result = await api.checkSlugAvailable(slugToCheck)
      if (!result.available) {
        setSlugError('Este slug já está em uso')
      } else {
        setSlugError('')
      }
    } catch {
      // Ignore errors
    }
  }, [originalSlug])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      checkSlug(slug)
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [slug, checkSlug])

  // Section management
  function handleAddSection() {
    if (!newSectionName.trim()) return

    const newSection: SectionData = {
      id: `new-${Date.now()}`,
      name: newSectionName.trim(),
      displayOrder: sections.length,
      isNew: true,
    }

    setSections([...sections, newSection])
    setNewSectionName('')
  }

  function handleRemoveSection(sectionId: string) {
    setSections(sections.filter((s) => s.id !== sectionId))
    // Move monitors from this section to "no section"
    setSelectedMonitors(
      selectedMonitors.map((m) =>
        m.sectionId === sectionId ? { ...m, sectionId: null } : m
      )
    )
  }

  function handleSectionNameChange(sectionId: string, newName: string) {
    setSections(
      sections.map((s) =>
        s.id === sectionId ? { ...s, name: newName } : s
      )
    )
  }

  // Drag handlers for sections
  function handleSectionDragStart(event: DragStartEvent) {
    setActiveSectionId(event.active.id as string)
  }

  function handleSectionDragEnd(event: DragEndEvent) {
    setActiveSectionId(null)
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((s) => s.id === active.id)
        const newIndex = items.findIndex((s) => s.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        // Update displayOrder
        return newItems.map((s, i) => ({ ...s, displayOrder: i }))
      })
    }
  }

  // Monitor management
  function handleMonitorToggle(monitorId: string) {
    setSelectedMonitors((prev) => {
      const exists = prev.find((m) => m.monitorId === monitorId)
      if (exists) {
        return prev.filter((m) => m.monitorId !== monitorId)
      }
      return [...prev, { monitorId, displayName: '', displayOrder: prev.length, sectionId: null }]
    })
  }

  function handleDisplayNameChange(monitorId: string, displayName: string) {
    setSelectedMonitors((prev) =>
      prev.map((m) =>
        m.monitorId === monitorId ? { ...m, displayName } : m
      )
    )
  }

  function handleMonitorSectionChange(monitorId: string, sectionId: string | null) {
    setSelectedMonitors((prev) =>
      prev.map((m) =>
        m.monitorId === monitorId ? { ...m, sectionId } : m
      )
    )
  }

  // Drag handlers for monitors
  function handleMonitorDragStart(event: DragStartEvent) {
    setActiveMonitorId(event.active.id as string)
  }

  function handleMonitorDragEnd(event: DragEndEvent, sectionId: string | null) {
    setActiveMonitorId(null)
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSelectedMonitors((items) => {
        // Get monitors in the same section
        const sectionMonitors = items.filter((m) => m.sectionId === sectionId)
        const otherMonitors = items.filter((m) => m.sectionId !== sectionId)

        const oldIndex = sectionMonitors.findIndex((m) => m.monitorId === active.id)
        const newIndex = sectionMonitors.findIndex((m) => m.monitorId === over.id)

        const reordered = arrayMove(sectionMonitors, oldIndex, newIndex)
        // Update displayOrder
        const updated = reordered.map((m, i) => ({ ...m, displayOrder: i }))

        return [...otherMonitors, ...updated]
      })
    }
  }

  // Group management
  function handleGroupToggle(groupId: string) {
    setSelectedGroups((prev) => {
      const exists = prev.find((g) => g.groupId === groupId)
      if (exists) {
        return prev.filter((g) => g.groupId !== groupId)
      }
      return [...prev, { groupId, displayName: '', displayOrder: prev.length, isExpanded: true }]
    })
  }

  function handleGroupDisplayNameChange(groupId: string, displayName: string) {
    setSelectedGroups((prev) =>
      prev.map((g) =>
        g.groupId === groupId ? { ...g, displayName } : g
      )
    )
  }

  function handleGroupExpandedChange(groupId: string, isExpanded: boolean) {
    setSelectedGroups((prev) =>
      prev.map((g) =>
        g.groupId === groupId ? { ...g, isExpanded } : g
      )
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (slugError) {
      setError('Por favor, escolha um slug disponível')
      return
    }

    setLoading(true)

    try {
      // Update status page settings
      await api.updateStatusPage(id, {
        name,
        slug,
        description: description || undefined,
        isPublic,
        primaryColor,
        backgroundColor,
        showUptime,
        showLatency,
        showHistory,
        historyDays,
      })

      // Update layout (sections and monitors)
      await api.updateStatusPageLayout(id, {
        sections: sections.map((s) => ({
          id: s.isNew ? undefined : s.id,
          name: s.name,
          displayOrder: s.displayOrder,
        })),
        monitors: selectedMonitors.map((m) => ({
          monitorId: m.monitorId,
          displayName: m.displayName || null,
          displayOrder: m.displayOrder,
          sectionId: m.sectionId,
        })),
      })

      // Update groups
      await api.updateStatusPageGroups(id, {
        groups: selectedGroups.map((g) => ({
          groupId: g.groupId,
          displayName: g.displayName || null,
          displayOrder: g.displayOrder,
          isExpanded: g.isExpanded,
        })),
      })

      router.push(`/status-pages/${id}`)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.details && apiError.details.length > 0) {
        setError(apiError.details.map((d) => d.message).join('. '))
      } else {
        setError(apiError.error || 'Erro ao atualizar página de status')
      }
    } finally {
      setLoading(false)
    }
  }

  // Get monitors for a specific section (or null for "no section")
  function getMonitorsForSection(sectionId: string | null) {
    return selectedMonitors
      .filter((m) => m.sectionId === sectionId)
      .sort((a, b) => a.displayOrder - b.displayOrder)
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400">Carregando...</span>
        </div>
      </div>
    )
  }

  if (!statusPage) {
    return (
      <div className="p-8">
        <Link
          href="/status-pages"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Status Pages
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error || 'Página não encontrada'}
        </div>
      </div>
    )
  }

  const sortedSections = [...sections].sort((a, b) => a.displayOrder - b.displayOrder)
  const unassignedMonitors = getMonitorsForSection(null)
  const activeSection = activeSectionId ? sections.find((s) => s.id === activeSectionId) : null
  const activeMonitor = activeMonitorId ? monitors.find((m) => m.id === activeMonitorId) : null
  const activeMonitorSelection = activeMonitorId ? selectedMonitors.find((m) => m.monitorId === activeMonitorId) : null

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href={`/status-pages/${id}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {statusPage.name}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Editar Status Page</h1>
        <p className="text-zinc-400 mt-1">Atualize as configurações da página de status</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Informações básicas</h2>

          {/* Nome */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
              Nome da página
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

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-zinc-300 mb-2">
              Slug (URL)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">/status/</span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
                minLength={3}
                maxLength={50}
                className={`flex-1 px-4 py-2.5 bg-zinc-800 border rounded-lg text-white placeholder-zinc-500 focus:outline-none transition-colors ${
                  slugError
                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-zinc-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
                }`}
              />
            </div>
            {slugError && (
              <p className="text-xs text-red-400 mt-1">{slugError}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors resize-none"
            />
          </div>

          {/* Is Public */}
          <div className="flex items-center gap-3">
            <input
              id="isPublic"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
            />
            <label htmlFor="isPublic" className="text-sm text-zinc-300">
              Página pública
            </label>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Aparência</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="primaryColor" className="block text-sm font-medium text-zinc-300 mb-2">
                Cor primária
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="backgroundColor" className="block text-sm font-medium text-zinc-300 mb-2">
                Cor de fundo
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="backgroundColor"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Configurações de exibição</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                id="showUptime"
                type="checkbox"
                checked={showUptime}
                onChange={(e) => setShowUptime(e.target.checked)}
                className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
              />
              <label htmlFor="showUptime" className="text-sm text-zinc-300">
                Mostrar porcentagem de uptime
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="showLatency"
                type="checkbox"
                checked={showLatency}
                onChange={(e) => setShowLatency(e.target.checked)}
                className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
              />
              <label htmlFor="showLatency" className="text-sm text-zinc-300">
                Mostrar latência
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="showHistory"
                type="checkbox"
                checked={showHistory}
                onChange={(e) => setShowHistory(e.target.checked)}
                className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
              />
              <label htmlFor="showHistory" className="text-sm text-zinc-300">
                Mostrar histórico de uptime
              </label>
            </div>
          </div>

          {showHistory && (
            <div>
              <label htmlFor="historyDays" className="block text-sm font-medium text-zinc-300 mb-2">
                Dias de histórico
              </label>
              <input
                id="historyDays"
                type="number"
                value={historyDays}
                onChange={(e) => setHistoryDays(Number(e.target.value))}
                min={7}
                max={365}
                className="w-32 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Sections Management */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Seções</h2>
              <p className="text-sm text-zinc-400 mt-1">Arraste para reordenar as seções</p>
            </div>
          </div>

          {/* Add new section */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Nome da nova seção"
              className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddSection()
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddSection}
              disabled={!newSectionName.trim()}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              Adicionar
            </button>
          </div>

          {/* Sections list with drag and drop */}
          {sortedSections.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleSectionDragStart}
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext
                items={sortedSections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {sortedSections.map((section) => (
                    <SortableSection
                      key={section.id}
                      section={section}
                      monitorCount={getMonitorsForSection(section.id).length}
                      onNameChange={handleSectionNameChange}
                      onRemove={handleRemoveSection}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeSection && (
                  <DragOverlayItem>
                    <div className="flex items-center gap-3 p-4 bg-zinc-800 rounded-lg border border-orange-500">
                      <DragHandleIcon className="w-5 h-5 text-orange-400" />
                      <span className="text-white">{activeSection.name}</span>
                    </div>
                  </DragOverlayItem>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* Monitors Selection */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Monitors</h2>
          <p className="text-sm text-zinc-400">Arraste para reordenar os monitors dentro de cada seção</p>

          {monitors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-400 mb-4">Nenhum monitor encontrado</p>
              <Link
                href="/monitors/new"
                className="text-orange-400 hover:text-orange-300 text-sm"
              >
                Criar primeiro monitor
              </Link>
            </div>
          ) : (
            <>
              {/* Available monitors */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Disponíveis</p>
                {monitors
                  .filter((m) => !selectedMonitors.find((sm) => sm.monitorId === m.id))
                  .map((monitor) => (
                    <label
                      key={monitor.id}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-zinc-800 border border-transparent hover:border-zinc-700"
                    >
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => handleMonitorToggle(monitor.id)}
                        className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
                      />
                      <div className="flex-1">
                        <p className="text-white font-medium">{monitor.name}</p>
                        <p className="text-xs text-zinc-500">{monitor.url}</p>
                      </div>
                    </label>
                  ))}
                {monitors.filter((m) => !selectedMonitors.find((sm) => sm.monitorId === m.id)).length === 0 && (
                  <p className="text-zinc-500 text-sm italic">Todos os monitors foram selecionados</p>
                )}
              </div>

              {/* Monitors without section */}
              {unassignedMonitors.length > 0 && (
                <div className="space-y-2 mt-6">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
                    Sem seção ({unassignedMonitors.length})
                  </p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleMonitorDragStart}
                    onDragEnd={(event) => handleMonitorDragEnd(event, null)}
                  >
                    <SortableContext
                      items={unassignedMonitors.map((m) => m.monitorId)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {unassignedMonitors.map((sm) => {
                          const monitor = monitors.find((m) => m.id === sm.monitorId)
                          if (!monitor) return null

                          return (
                            <SortableMonitorCard
                              key={sm.monitorId}
                              monitor={monitor}
                              selection={sm}
                              sections={sections}
                              onToggle={handleMonitorToggle}
                              onDisplayNameChange={handleDisplayNameChange}
                              onSectionChange={handleMonitorSectionChange}
                            />
                          )
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {/* Monitors by section */}
              {sortedSections.map((section) => {
                const sectionMonitors = getMonitorsForSection(section.id)

                return (
                  <div key={section.id} className="space-y-2 mt-6">
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
                      {section.name} ({sectionMonitors.length})
                    </p>
                    {sectionMonitors.length === 0 ? (
                      <p className="text-zinc-500 text-sm italic p-3">Nenhum monitor nesta seção</p>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleMonitorDragStart}
                        onDragEnd={(event) => handleMonitorDragEnd(event, section.id)}
                      >
                        <SortableContext
                          items={sectionMonitors.map((m) => m.monitorId)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {sectionMonitors.map((sm) => {
                              const monitor = monitors.find((m) => m.id === sm.monitorId)
                              if (!monitor) return null

                              return (
                                <SortableMonitorCard
                                  key={sm.monitorId}
                                  monitor={monitor}
                                  selection={sm}
                                  sections={sections}
                                  onToggle={handleMonitorToggle}
                                  onDisplayNameChange={handleDisplayNameChange}
                                  onSectionChange={handleMonitorSectionChange}
                                />
                              )
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                )
              })}

              {/* Drag overlay for monitors */}
              <DragOverlay>
                {activeMonitor && activeMonitorSelection && (
                  <DragOverlayItem>
                    <div className="flex items-center gap-3 p-4 bg-orange-500/20 rounded-lg border border-orange-500">
                      <DragHandleIcon className="w-5 h-5 text-orange-400" />
                      <span className="text-white">{activeMonitor.name}</span>
                    </div>
                  </DragOverlayItem>
                )}
              </DragOverlay>
            </>
          )}

          {selectedMonitors.length > 0 && (
            <p className="text-sm text-zinc-400">
              {selectedMonitors.length} monitor{selectedMonitors.length > 1 ? 's' : ''} selecionado{selectedMonitors.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Groups Selection */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Grupos</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Adicione grupos de monitors para exibição agregada na página pública
            </p>
          </div>

          {availableGroups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-400 mb-4">Nenhum grupo encontrado</p>
              <Link
                href="/groups/new"
                className="text-orange-400 hover:text-orange-300 text-sm"
              >
                Criar primeiro grupo
              </Link>
            </div>
          ) : (
            <>
              {/* Available groups */}
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Grupos disponíveis</p>
                {availableGroups
                  .filter((g) => !selectedGroups.find((sg) => sg.groupId === g.id))
                  .map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-zinc-800 border border-transparent hover:border-zinc-700"
                    >
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => handleGroupToggle(group.id)}
                        className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
                      />
                      <div className="flex-1">
                        <p className="text-white font-medium">{group.name}</p>
                        {group.description && (
                          <p className="text-xs text-zinc-500">{group.description}</p>
                        )}
                      </div>
                      <span className="text-sm text-zinc-400">
                        {group.monitors?.length || 0} monitors
                      </span>
                    </label>
                  ))}
                {availableGroups.filter((g) => !selectedGroups.find((sg) => sg.groupId === g.id)).length === 0 && (
                  <p className="text-zinc-500 text-sm italic">Todos os grupos foram selecionados</p>
                )}
              </div>

              {/* Selected groups */}
              {selectedGroups.length > 0 && (
                <div className="space-y-3 mt-6">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
                    Grupos selecionados ({selectedGroups.length})
                  </p>
                  {selectedGroups.map((sg) => {
                    const group = availableGroups.find((g) => g.id === sg.groupId)
                    if (!group) return null

                    return (
                      <div
                        key={sg.groupId}
                        className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={true}
                            onChange={() => handleGroupToggle(sg.groupId)}
                            className="w-4 h-4 mt-1 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
                          />
                          <div className="flex-1">
                            <p className="text-white font-medium">{group.name}</p>
                            {group.description && (
                              <p className="text-xs text-zinc-500">{group.description}</p>
                            )}
                          </div>
                          <span className="text-sm text-zinc-400">
                            {group.monitors?.length || 0} monitors
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 ml-7">
                          {/* Display name */}
                          <input
                            type="text"
                            value={sg.displayName}
                            onChange={(e) => handleGroupDisplayNameChange(sg.groupId, e.target.value)}
                            placeholder="Nome customizado (opcional)"
                            className="px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                          />

                          {/* Expanded toggle */}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sg.isExpanded}
                              onChange={(e) => handleGroupExpandedChange(sg.groupId, e.target.checked)}
                              className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
                            />
                            <span className="text-sm text-zinc-400">Expandido por padrão</span>
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {selectedGroups.length > 0 && (
                <p className="text-sm text-zinc-400">
                  {selectedGroups.length} grupo{selectedGroups.length > 1 ? 's' : ''} selecionado{selectedGroups.length > 1 ? 's' : ''}
                </p>
              )}
            </>
          )}
        </div>

        {/* Widget Embed */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Widget Embed</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Incorpore um widget de status no seu site
            </p>
          </div>

          <div className="space-y-4">
            {/* Badge size */}
            <div>
              <p className="text-sm font-medium text-zinc-300 mb-2">Badge (mini)</p>
              <div className="bg-zinc-800 rounded-lg p-4 font-mono text-sm text-zinc-300 overflow-x-auto">
                <code>{`<div data-taco-status="${slug}" data-taco-size="badge"></div>
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/status/${slug}/widget.js"></script>`}</code>
              </div>
            </div>

            {/* Compact size */}
            <div>
              <p className="text-sm font-medium text-zinc-300 mb-2">Compacto</p>
              <div className="bg-zinc-800 rounded-lg p-4 font-mono text-sm text-zinc-300 overflow-x-auto">
                <code>{`<div data-taco-status="${slug}" data-taco-size="compact"></div>
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/status/${slug}/widget.js"></script>`}</code>
              </div>
            </div>

            {/* Default size */}
            <div>
              <p className="text-sm font-medium text-zinc-300 mb-2">Padrão</p>
              <div className="bg-zinc-800 rounded-lg p-4 font-mono text-sm text-zinc-300 overflow-x-auto">
                <code>{`<div data-taco-status="${slug}"></div>
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/status/${slug}/widget.js"></script>`}</code>
              </div>
            </div>

            <div className="text-xs text-zinc-500 space-y-1">
              <p><strong>Opções disponíveis:</strong></p>
              <p>• <code className="bg-zinc-800 px-1 rounded">data-taco-size</code>: "badge", "compact" ou padrão</p>
              <p>• <code className="bg-zinc-800 px-1 rounded">data-taco-label</code>: "false" para ocultar label</p>
              <p>• <code className="bg-zinc-800 px-1 rounded">data-taco-url</code>: URL customizada para o link</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/status-pages/${id}`}
            className="px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || !!slugError}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar alterações'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
