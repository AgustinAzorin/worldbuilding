'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import type {
  ArticleRelationEdge,
  ArticleSuggestion,
  RelationsManagerModule,
} from '@/lib/types'

/** Etiquetas frecuentes para llenar el datalist del input. */
const COMMON_LABELS = [
  'Padre', 'Madre', 'Hijo', 'Hija', 'Hermano', 'Hermana',
  'Esposo', 'Esposa', 'Amante',
  'Aliado', 'Rival', 'Enemigo',
  'Líder', 'Mentor', 'Discípulo',
]

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

interface Props {
  module: RelationsManagerModule
  worldId: string
  articleId: string | null
  initialRelations: ArticleRelationEdge[]
}

export function RelationsManagerModuleView({
  worldId,
  articleId,
  initialRelations,
}: Props) {
  // Local copy: arrancamos con las relaciones explícitas (semánticas) que
  // vinieron del server, y mutamos en memoria al añadir/eliminar.
  const [relations, setRelations] = useState<ArticleRelationEdge[]>(
    () => initialRelations.filter(r => r.connectionType === 'semantic'),
  )
  useEffect(() => {
    setRelations(initialRelations.filter(r => r.connectionType === 'semantic'))
  }, [initialRelations])

  // ── Combobox de búsqueda ────────────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<ArticleSuggestion[]>([])
  const [picked, setPicked] = useState<ArticleSuggestion | null>(null)
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const datalistId = useMemo(() => `relmgr-labels-${Math.random().toString(36).slice(2, 8)}`, [])
  const inFlightQuery = useRef<string>('')

  useEffect(() => {
    if (!query.trim() || picked) {
      setSuggestions([])
      return
    }
    const q = query.trim()
    inFlightQuery.current = q
    let cancelled = false
    const t = window.setTimeout(async () => {
      try {
        const token = await getToken()
        const items = await api.articles.search(token, worldId, q)
        // Evitar carrera con búsquedas posteriores.
        if (cancelled || inFlightQuery.current !== q) return
        setSuggestions(items.filter(s => s.id !== articleId).slice(0, 8))
      } catch {
        if (!cancelled) setSuggestions([])
      }
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [query, picked, worldId, articleId])

  const reset = useCallback(() => {
    setQuery('')
    setPicked(null)
    setLabel('')
    setSuggestions([])
    setShowSuggestions(false)
  }, [])

  const handleAdd = useCallback(async () => {
    if (!articleId) return
    if (!picked) { setError('Seleccioná un artículo destino'); return }
    if (!label.trim()) { setError('Indicá un tipo de relación (ej: Padre, Rival)'); return }

    setSaving(true); setError(null)
    try {
      const token = await getToken()
      const edge = await api.articles.createSemanticRelation(
        token, articleId, picked.id, label.trim(),
      )
      setRelations(prev => [...prev, edge])
      reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la relación')
    } finally {
      setSaving(false)
    }
  }, [articleId, label, picked, reset])

  const handleRemove = useCallback(async (relationId: string) => {
    setError(null)
    // Optimista: removemos en local, revertimos si falla.
    const prev = relations
    setRelations(p => p.filter(r => r.relationId !== relationId))
    try {
      const token = await getToken()
      await api.articles.deleteSemanticRelation(token, relationId)
    } catch (e) {
      setRelations(prev)
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la relación')
    }
  }, [relations])

  if (!articleId) {
    return (
      <p className="text-xs text-gray-400 italic">
        Guardá el artículo antes de declarar relaciones explícitas.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Formulario ───────────────────────────────────────────────── */}
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,160px,auto] gap-2">
          <div className="relative">
            <input
              type="text"
              value={picked ? picked.title : query}
              onChange={e => {
                setPicked(null)
                setQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Buscar artículo…"
              aria-label="Buscar artículo destino"
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            {showSuggestions && suggestions.length > 0 && !picked && (
              <ul
                role="listbox"
                className="absolute z-10 left-0 right-0 mt-1 max-h-56 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg text-sm"
              >
                {suggestions.map(s => (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={e => {
                        e.preventDefault()
                        setPicked(s)
                        setQuery('')
                        setSuggestions([])
                        setShowSuggestions(false)
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                    >
                      {s.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Tipo (ej: Rival)"
            aria-label="Tipo de relación"
            list={datalistId}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <datalist id={datalistId}>
            {COMMON_LABELS.map(l => <option key={l} value={l} />)}
          </datalist>

          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !picked || !label.trim()}
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Añadir'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* ── Lista de relaciones explícitas ──────────────────────────── */}
      {relations.length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          Sin relaciones explícitas declaradas todavía.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
          {relations.map(r => (
            <li
              key={r.relationId}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-medium">
                {r.label ?? '—'}
              </span>
              <Link
                href={`/worlds/${worldId}/articles/${r.id}`}
                className="text-blue-600 hover:underline flex-1 truncate"
              >
                {r.title}
              </Link>
              <button
                type="button"
                onClick={() => handleRemove(r.relationId)}
                aria-label={`Eliminar relación con ${r.title}`}
                className="text-xs text-gray-400 hover:text-red-600"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
