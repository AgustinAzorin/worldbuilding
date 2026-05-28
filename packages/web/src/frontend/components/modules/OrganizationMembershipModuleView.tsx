'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import type {
  ArticleRelationEdge,
  ArticleSuggestion,
  OrganizationMembershipModule,
} from '@/lib/types'

const MEMBERSHIP_LABEL = 'Miembro de'

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

interface Props {
  module: OrganizationMembershipModule
  worldId: string
  articleId: string | null
  initialRelations: ArticleRelationEdge[]
}

/**
 * UI que declara "X es miembro de Y" sobre `article_relations`.
 * Es la misma tabla que usa el módulo "Relaciones explícitas", pero
 * filtrada a aristas semánticas cuyo `relation_label === 'Miembro de'`
 * y cuyo `target` es un artículo de tipo `organization`.
 */
export function OrganizationMembershipModuleView({
  worldId,
  articleId,
  initialRelations,
}: Props) {
  // Hidratamos sólo con las aristas "Miembro de" salientes del artículo.
  const [memberships, setMemberships] = useState<ArticleRelationEdge[]>(
    () => initialRelations.filter(
      r => r.connectionType === 'semantic' && r.label === MEMBERSHIP_LABEL,
    ),
  )
  useEffect(() => {
    setMemberships(initialRelations.filter(
      r => r.connectionType === 'semantic' && r.label === MEMBERSHIP_LABEL,
    ))
  }, [initialRelations])

  // ── Combobox restringido a artículos de tipo 'organization' ─────────
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<ArticleSuggestion[]>([])
  const [picked, setPicked] = useState<ArticleSuggestion | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlightQuery = useRef<string>('')

  useEffect(() => {
    if (picked) { setSuggestions([]); return }
    const q = query.trim()
    inFlightQuery.current = q
    let cancelled = false
    const t = window.setTimeout(async () => {
      try {
        const token = await getToken()
        const items = await api.articles.search(token, worldId, q, 'organization')
        if (cancelled || inFlightQuery.current !== q) return
        const taken = new Set(memberships.map(m => m.id))
        setSuggestions(
          items
            .filter(s => s.id !== articleId && !taken.has(s.id))
            .slice(0, 8),
        )
      } catch {
        if (!cancelled) setSuggestions([])
      }
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [query, picked, worldId, articleId, memberships])

  const reset = useCallback(() => {
    setQuery('')
    setPicked(null)
    setSuggestions([])
    setShowSuggestions(false)
  }, [])

  const handleAdd = useCallback(async () => {
    if (!articleId || !picked) return
    setSaving(true); setError(null)
    try {
      const token = await getToken()
      const edge = await api.articles.createSemanticRelation(
        token, articleId, picked.id, MEMBERSHIP_LABEL, null,
      )
      setMemberships(prev => [...prev, edge])
      reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo añadir la membresía')
    } finally {
      setSaving(false)
    }
  }, [articleId, picked, reset])

  const handleRemove = useCallback(async (relationId: string) => {
    setError(null)
    const prev = memberships
    setMemberships(p => p.filter(r => r.relationId !== relationId))
    try {
      const token = await getToken()
      await api.articles.deleteSemanticRelation(token, relationId)
    } catch (e) {
      setMemberships(prev)
      setError(e instanceof Error ? e.message : 'No se pudo romper la membresía')
    }
  }, [memberships])

  if (!articleId) {
    return (
      <p className="text-xs text-gray-400 italic">
        Guardá el artículo antes de declarar membresías.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Combobox de añadir membresía ──────────────────────────────── */}
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-2">
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
              placeholder="Buscar organización…"
              aria-label="Buscar organización"
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            {showSuggestions && !picked && (
              <ul
                role="listbox"
                className="absolute z-10 left-0 right-0 mt-1 max-h-56 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg text-sm"
              >
                {suggestions.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-gray-400 italic">
                    {query.trim()
                      ? 'Ninguna organización coincide.'
                      : 'Escribí para buscar entre las organizaciones del mundo.'}
                  </li>
                ) : (
                  suggestions.map(s => (
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
                        className="w-full text-left px-3 py-1.5 hover:bg-indigo-50"
                      >
                        {s.title}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !picked}
            className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Añadir'}
          </button>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* ── Lista de membresías ──────────────────────────────────────── */}
      {memberships.length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          Este artículo no es miembro de ninguna organización todavía.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
          {memberships.map(m => (
            <li
              key={m.relationId}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs font-medium">
                Miembro de
              </span>
              <Link
                href={`/worlds/${worldId}/articles/${m.id}`}
                className="flex-1 truncate text-indigo-700 hover:underline"
              >
                {m.title}
              </Link>
              <button
                type="button"
                onClick={() => handleRemove(m.relationId)}
                aria-label={`Romper membresía con ${m.title}`}
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
