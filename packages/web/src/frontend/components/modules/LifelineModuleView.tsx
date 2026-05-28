'use client'

import { useCallback, useMemo, useState } from 'react'
import type { LifelineMilestone, LifelineModule } from '@/lib/types'

interface Props {
  module: LifelineModule
  onChange: (next: LifelineModule) => void
}

function rid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `hito-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function sortByYear(items: LifelineMilestone[]): LifelineMilestone[] {
  return [...items].sort((a, b) => a.year - b.year)
}

const EMPTY_DRAFT = { year: '', date_display: '', title: '', description: '' }

export function LifelineModuleView({ module, onChange }: Props) {
  // Los hitos viajan ya ordenados por año (lo garantizamos en cada mutación).
  const milestones = module.data.milestones
  const sorted = useMemo(() => sortByYear(milestones), [milestones])

  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<typeof EMPTY_DRAFT>(EMPTY_DRAFT)

  const persist = useCallback((next: LifelineMilestone[]) => {
    onChange({ ...module, data: { milestones: sortByYear(next) } })
  }, [module, onChange])

  const handleAdd = useCallback(() => {
    const parsedYear = Number.parseInt(draft.year, 10)
    if (Number.isNaN(parsedYear)) return
    if (!draft.title.trim()) return
    const next: LifelineMilestone = {
      id: rid(),
      year: parsedYear,
      date_display: draft.date_display.trim(),
      title: draft.title.trim(),
      description: draft.description.trim(),
    }
    persist([...milestones, next])
    setDraft(EMPTY_DRAFT)
  }, [draft, milestones, persist])

  const handleRemove = useCallback((id: string) => {
    persist(milestones.filter(m => m.id !== id))
    if (editingId === id) setEditingId(null)
  }, [milestones, persist, editingId])

  const startEdit = useCallback((m: LifelineMilestone) => {
    setEditingId(m.id)
    setEditDraft({
      year: String(m.year),
      date_display: m.date_display,
      title: m.title,
      description: m.description,
    })
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditDraft(EMPTY_DRAFT)
  }, [])

  const commitEdit = useCallback(() => {
    if (!editingId) return
    const parsedYear = Number.parseInt(editDraft.year, 10)
    if (Number.isNaN(parsedYear)) return
    if (!editDraft.title.trim()) return
    persist(milestones.map(m =>
      m.id === editingId
        ? {
            ...m,
            year: parsedYear,
            date_display: editDraft.date_display.trim(),
            title: editDraft.title.trim(),
            description: editDraft.description.trim(),
          }
        : m,
    ))
    cancelEdit()
  }, [editingId, editDraft, milestones, persist, cancelEdit])

  const addEnabled =
    draft.year.trim() !== '' &&
    !Number.isNaN(Number.parseInt(draft.year, 10)) &&
    draft.title.trim() !== ''

  return (
    <div className="space-y-5">
      {/* ── Modo lectura: timeline vertical ─────────────────────────── */}
      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          Sin hitos todavía. Añadí el primero con el formulario de abajo.
        </p>
      ) : (
        <ol className="relative ml-3 border-l-2 border-amber-200 space-y-5">
          {sorted.map(m => (
            <li
              key={m.id}
              className="relative pl-5 group transition-all duration-300 ease-out"
            >
              <span
                aria-hidden
                className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-100 transition-transform duration-200 group-hover:scale-125"
              />
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      {m.date_display || `Año ${m.year}`}
                    </div>
                    <h4 className="mt-0.5 text-sm font-semibold text-gray-900">
                      {m.title}
                    </h4>
                    {m.description && (
                      <p className="mt-1 text-xs text-gray-600 whitespace-pre-line">
                        {m.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => startEdit(m)}
                      className="text-gray-500 hover:text-amber-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(m.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Form inline de edición */}
                {editingId === m.id && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-[90px,1fr] gap-2 border-t border-gray-100 pt-3">
                    <input
                      type="number"
                      value={editDraft.year}
                      onChange={e => setEditDraft(d => ({ ...d, year: e.target.value }))}
                      placeholder="Año"
                      aria-label="Año"
                      className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      value={editDraft.date_display}
                      onChange={e => setEditDraft(d => ({ ...d, date_display: e.target.value }))}
                      placeholder="Año 45 de la Segunda Era"
                      aria-label="Etiqueta de fecha"
                      className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      value={editDraft.title}
                      onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))}
                      placeholder="Título del hito"
                      aria-label="Título del hito"
                      className="sm:col-span-2 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <textarea
                      value={editDraft.description}
                      onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
                      placeholder="Descripción corta"
                      aria-label="Descripción del hito"
                      rows={2}
                      className="sm:col-span-2 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
                    />
                    <div className="sm:col-span-2 flex items-center justify-end gap-2 text-xs">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-2 py-1 text-gray-500 hover:text-gray-700"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={commitEdit}
                        className="px-3 py-1 rounded bg-amber-600 text-white font-medium hover:bg-amber-700"
                      >
                        Guardar hito
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* ── Modo edición: añadir hito ──────────────────────────────── */}
      <div className="rounded-md border border-dashed border-amber-300 bg-amber-50/50 p-3 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
          Añadir hito
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[90px,1fr] gap-2">
          <input
            type="number"
            value={draft.year}
            onChange={e => setDraft(d => ({ ...d, year: e.target.value }))}
            placeholder="Año"
            aria-label="Año del hito"
            className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          />
          <input
            type="text"
            value={draft.date_display}
            onChange={e => setDraft(d => ({ ...d, date_display: e.target.value }))}
            placeholder="Texto de la fecha (ej: Año 45 de la Segunda Era)"
            aria-label="Etiqueta de fecha"
            className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          />
          <input
            type="text"
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            placeholder="Título del hito"
            aria-label="Título del hito"
            className="sm:col-span-2 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          />
          <textarea
            value={draft.description}
            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            placeholder="Descripción corta"
            aria-label="Descripción del hito"
            rows={2}
            className="sm:col-span-2 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-y"
          />
        </div>
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!addEnabled}
            className="px-3 py-1.5 rounded bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            + Añadir hito
          </button>
        </div>
      </div>
    </div>
  )
}
