'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { FamilyTreeRenderer } from './FamilyTreeRenderer'
import type {
  ArticleRef,
  ArticleSuggestion,
  FamilyTreeDetail,
  FamilyTreeEdgeRow,
} from '@/lib/types'

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

interface Props {
  worldId: string
  initialTree: FamilyTreeDetail
}

interface SearchBoxProps {
  worldId: string
  placeholder: string
  value: ArticleSuggestion | null
  onChange: (v: ArticleSuggestion | null) => void
}

function ArticleSearchBox({ worldId, placeholder, value, onChange }: SearchBoxProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<ArticleSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const inFlight = useRef('')

  useEffect(() => {
    if (!query.trim() || value) { setSuggestions([]); return }
    const q = query.trim()
    inFlight.current = q
    let cancelled = false
    const t = window.setTimeout(async () => {
      try {
        const token = await getToken()
        const items = await api.articles.search(token, worldId, q)
        if (cancelled || inFlight.current !== q) return
        setSuggestions(items.slice(0, 8))
      } catch {
        if (!cancelled) setSuggestions([])
      }
    }, 180)
    return () => { cancelled = true; window.clearTimeout(t) }
  }, [query, value, worldId])

  return (
    <div className="relative">
      <input
        type="text"
        value={value ? value.title : query}
        onChange={e => { onChange(null); setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
      {open && suggestions.length > 0 && !value && (
        <ul
          role="listbox"
          className="absolute z-10 left-0 right-0 mt-1 max-h-56 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg text-sm"
        >
          {suggestions.map(s => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault()
                  onChange(s)
                  setQuery('')
                  setSuggestions([])
                  setOpen(false)
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
  )
}

export function TreeEditor({ worldId, initialTree }: Props) {
  const router = useRouter()
  const [tree, setTree] = useState<FamilyTreeDetail>(initialTree)
  const [name, setName] = useState(initialTree.name)
  const [description, setDescription] = useState(initialTree.description ?? '')
  const [savingMeta, setSavingMeta] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)

  // Form de nueva arista
  const [parent, setParent] = useState<ArticleSuggestion | null>(null)
  const [child, setChild] = useState<ArticleSuggestion | null>(null)
  const [adding, setAdding] = useState(false)
  const [edgeError, setEdgeError] = useState<string | null>(null)

  // ── Persistir nombre/descripción con debounce ──────────────────────────
  useEffect(() => {
    if (name === tree.name && description === (tree.description ?? '')) return
    const t = window.setTimeout(async () => {
      setSavingMeta(true); setMetaError(null)
      try {
        const token = await getToken()
        await api.trees.update(token, tree.id, {
          name: name.trim() || tree.name,
          description: description.trim() || null,
        })
        setTree(prev => ({
          ...prev,
          name: name.trim() || prev.name,
          description: description.trim() || null,
        }))
      } catch (e) {
        setMetaError(e instanceof Error ? e.message : 'Error al guardar')
      } finally {
        setSavingMeta(false)
      }
    }, 600)
    return () => window.clearTimeout(t)
  }, [name, description, tree.id, tree.name, tree.description])

  const memberMap = useMemo(
    () => new Map(tree.members.map(m => [m.id, m])),
    [tree.members],
  )

  const handleAddEdge = useCallback(async () => {
    if (!parent || !child) { setEdgeError('Elegí padre y hijo'); return }
    if (parent.id === child.id) { setEdgeError('No se puede ser padre de sí mismo'); return }

    setAdding(true); setEdgeError(null)
    try {
      const token = await getToken()
      const edge = await api.trees.addEdge(token, tree.id, parent.id, child.id)
      setTree(prev => {
        const nextMembers: ArticleRef[] = [...prev.members]
        if (!memberMap.has(parent.id)) nextMembers.push({ id: parent.id, title: parent.title })
        if (!memberMap.has(child.id))  nextMembers.push({ id: child.id,  title: child.title  })
        return { ...prev, members: nextMembers, edges: [...prev.edges, edge] }
      })
      setParent(null); setChild(null)
    } catch (e) {
      setEdgeError(e instanceof Error ? e.message : 'No se pudo añadir la relación')
    } finally {
      setAdding(false)
    }
  }, [parent, child, tree.id, memberMap])

  const handleRemoveEdge = useCallback(async (edge: FamilyTreeEdgeRow) => {
    const prevEdges = tree.edges
    setTree(p => ({ ...p, edges: p.edges.filter(e => e.id !== edge.id) }))
    try {
      const token = await getToken()
      await api.trees.removeEdge(token, edge.id)
    } catch (e) {
      setTree(p => ({ ...p, edges: prevEdges }))
      setEdgeError(e instanceof Error ? e.message : 'No se pudo eliminar la relación')
    }
  }, [tree.edges])

  const handleDeleteTree = useCallback(async () => {
    if (!window.confirm(`¿Eliminar el árbol "${tree.name}"? Esta acción no se puede deshacer.`)) return
    try {
      const token = await getToken()
      await api.trees.remove(token, tree.id)
      router.push(`/worlds/${worldId}/trees`)
    } catch (e) {
      setMetaError(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }, [router, tree.id, tree.name, worldId])

  return (
    <div className="space-y-6">
      {/* ── Header editable ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre del árbol"
          className="w-full text-3xl font-bold bg-transparent border-none outline-none text-gray-900"
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descripción (opcional)"
          rows={2}
          className="w-full text-sm text-gray-700 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-2 py-1 outline-none resize-none"
        />
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-400">
            {savingMeta ? 'Guardando…' : `${tree.members.length} miembros · ${tree.edges.length} parentescos`}
          </span>
          {metaError && <span className="text-red-500">{metaError}</span>}
          <button
            type="button"
            onClick={handleDeleteTree}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            Eliminar árbol
          </button>
        </div>
      </section>

      {/* ── Añadir relación padre → hijo ───────────────────────────────── */}
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Añadir relación padre → hijo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr,auto] gap-2 items-center">
          <ArticleSearchBox
            worldId={worldId}
            placeholder="Padre / Madre…"
            value={parent}
            onChange={setParent}
          />
          <span className="text-center text-gray-400 text-sm hidden sm:inline">→</span>
          <ArticleSearchBox
            worldId={worldId}
            placeholder="Hijo / Hija…"
            value={child}
            onChange={setChild}
          />
          <button
            type="button"
            onClick={handleAddEdge}
            disabled={adding || !parent || !child}
            className="px-4 py-1.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? 'Añadiendo…' : 'Añadir'}
          </button>
        </div>
        {edgeError && <p className="text-xs text-red-600">{edgeError}</p>}
      </section>

      {/* ── Render del árbol ──────────────────────────────────────────── */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Vista del árbol</h2>
        <FamilyTreeRenderer
          worldId={worldId}
          members={tree.members}
          edges={tree.edges}
        />
      </section>

      {/* ── Listado tabular de aristas (para eliminar) ─────────────────── */}
      {tree.edges.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Parentescos declarados</h2>
          <ul className="divide-y divide-gray-100">
            {tree.edges.map(e => {
              const p = memberMap.get(e.parent_id)
              const c = memberMap.get(e.child_id)
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-2 py-2 text-sm"
                >
                  <span className="text-gray-900 truncate flex-1">
                    {p?.title ?? '—'}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-900 truncate flex-1">
                    {c?.title ?? '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEdge(e)}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    Eliminar
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
