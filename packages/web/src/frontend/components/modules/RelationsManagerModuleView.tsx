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

// Mismo encoding que el grafo: −100 rojo, 0 gris, +100 verde.
function diplomacyTextColor(score: number | null): string {
  if (score === null) return 'text-slate-500'
  if (score <= -60)   return 'text-red-600'
  if (score <= -20)   return 'text-orange-500'
  if (score <   20)   return 'text-slate-500'
  if (score <   60)   return 'text-lime-600'
  return 'text-green-600'
}

function diplomacyLabel(score: number | null): string {
  if (score === null) return 'Sin ponderar'
  if (score <= -75)   return 'Guerra'
  if (score <= -25)   return 'Hostil'
  if (score <    25)  return 'Neutral'
  if (score <    75)  return 'Aliado'
  return 'Alianza total'
}

interface DiplomacySliderProps {
  value: number | null
  onChange: (next: number) => void
  onCommit: (next: number) => void
}

function DiplomacySlider({ value, onChange, onCommit }: DiplomacySliderProps) {
  const display = value ?? 0
  const colorClass = diplomacyTextColor(value)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-medium text-gray-500">
        <span>Hostilidad</span>
        <span className={`font-semibold ${colorClass}`}>
          {display > 0 ? `+${display}` : display} · {diplomacyLabel(value)}
        </span>
        <span>Alianza</span>
      </div>
      <input
        type="range"
        min={-100}
        max={100}
        step={1}
        value={display}
        onChange={e => onChange(Number.parseInt(e.target.value, 10))}
        onPointerUp={e => onCommit(Number.parseInt((e.target as HTMLInputElement).value, 10))}
        onKeyUp={e => onCommit(Number.parseInt((e.target as HTMLInputElement).value, 10))}
        aria-label="Puntaje diplomático entre -100 y 100"
        className="w-full h-1.5 appearance-none rounded-full cursor-pointer bg-gradient-to-r from-red-500 via-slate-300 to-green-500 accent-blue-600"
      />
    </div>
  )
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
  const [newScore, setNewScore] = useState<number>(0)
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
    setNewScore(0)
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
      // newScore === 0 lo guardamos como NULL para distinguir "neutro
      // ponderado" de "no ponderado todavía". El criterio del producto es
      // que 0 explícito sigue siendo neutro pintado en gris → mandamos el
      // valor directo. El usuario puede después borrar la relación si
      // realmente no quiere ponderar.
      const edge = await api.articles.createSemanticRelation(
        token, articleId, picked.id, label.trim(), newScore,
      )
      setRelations(prev => [...prev, edge])
      reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la relación')
    } finally {
      setSaving(false)
    }
  }, [articleId, label, newScore, picked, reset])

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

  // Slider local (sin persistir) — pintamos optimistamente mientras el
  // usuario arrastra.
  const handleScoreDrag = useCallback((relationId: string, score: number) => {
    setRelations(prev =>
      prev.map(r => (r.relationId === relationId ? { ...r, diplomacyScore: score } : r)),
    )
  }, [])

  // Commit (pointer-up / keyboard release) — persiste el valor final.
  const handleScoreCommit = useCallback(async (relationId: string, score: number) => {
    setError(null)
    try {
      const token = await getToken()
      await api.articles.updateRelationDiplomacy(token, relationId, score)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el puntaje diplomático')
    }
  }, [])

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

        {/* Slider de diplomacia para la NUEVA relación (sólo semánticas) */}
        <DiplomacySlider
          value={newScore}
          onChange={setNewScore}
          onCommit={setNewScore}
        />

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
              className="px-3 py-2 text-sm space-y-2"
            >
              <div className="flex items-center gap-3">
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
              </div>
              <DiplomacySlider
                value={r.diplomacyScore}
                onChange={score => handleScoreDrag(r.relationId, score)}
                onCommit={score => handleScoreCommit(r.relationId, score)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
