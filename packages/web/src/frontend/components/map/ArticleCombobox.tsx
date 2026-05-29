'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import type { ArticleSuggestion } from '@/lib/types'

interface Props {
  worldId: string
  /** Artículo actualmente enlazado (o null). */
  value: ArticleSuggestion | null
  onChange: (article: ArticleSuggestion | null) => void
  disabled?: boolean
}

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

/**
 * Combobox de búsqueda de artículos del mundo. Escribe para filtrar por
 * título (debounce 250 ms) y seleccioná un resultado para enlazar el pin.
 */
export function ArticleCombobox({ worldId, value, onChange, disabled }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ArticleSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // Búsqueda con debounce.
  useEffect(() => {
    const q = query.trim()
    if (!open || q.length === 0) {
      setResults([])
      return
    }
    let cancelled = false
    setLoading(true)
    const handle = setTimeout(async () => {
      try {
        const token = await getToken()
        const data = await api.articles.search(token, worldId, q)
        if (!cancelled) setResults(data)
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [query, open, worldId])

  // Cierra el dropdown al hacer click afuera.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
        <span className="truncate text-sm font-medium text-blue-800">
          🔗 {value.title}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="shrink-0 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          Quitar
        </button>
      </div>
    )
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar un artículo del mundo…"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />

      {open && query.trim().length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading && (
            <li className="px-3 py-2 text-sm text-gray-400">Buscando…</li>
          )}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">Sin resultados</li>
          )}
          {results.map(article => (
            <li key={article.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(article)
                  setQuery('')
                  setOpen(false)
                }}
                className="block w-full truncate px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
              >
                {article.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
