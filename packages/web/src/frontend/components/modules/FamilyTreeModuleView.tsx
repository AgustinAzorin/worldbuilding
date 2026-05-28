'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { FamilyTreeRenderer } from '../FamilyTreeRenderer'
import type {
  FamilyTreeDetail,
  FamilyTreeModule,
  FamilyTreeSummary,
} from '@/lib/types'

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

interface Props {
  module: FamilyTreeModule
  worldId: string
  articleId: string | null
  onChange: (next: FamilyTreeModule) => void
}

export function FamilyTreeModuleView({
  module,
  worldId,
  articleId,
  onChange,
}: Props) {
  // Compat: módulos pre-migración pueden venir con `data: {}`.
  const treeId = (module.data && 'treeId' in module.data) ? module.data.treeId : null

  const [trees, setTrees] = useState<FamilyTreeSummary[] | null>(null)
  const [tree, setTree] = useState<FamilyTreeDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar lista de árboles del mundo para el selector.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        const list = await api.worlds.listTrees(token, worldId)
        if (!cancelled) setTrees(list)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar árboles')
      }
    })()
    return () => { cancelled = true }
  }, [worldId])

  // Cargar el árbol referenciado.
  useEffect(() => {
    if (!treeId) { setTree(null); return }
    let cancelled = false
    setLoading(true); setError(null)
    ;(async () => {
      try {
        const token = await getToken()
        const detail = await api.trees.get(token, treeId)
        if (!cancelled) setTree(detail)
      } catch (e) {
        if (!cancelled) {
          setTree(null)
          setError(e instanceof Error ? e.message : 'Error al cargar el árbol')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [treeId])

  const handleSelect = useCallback((id: string | null) => {
    onChange({ ...module, data: { treeId: id } })
  }, [module, onChange])

  return (
    <div className="space-y-3">
      {/* ── Selector ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold text-gray-500 uppercase">
          Árbol referenciado:
        </label>
        <select
          value={treeId ?? ''}
          onChange={e => handleSelect(e.target.value || null)}
          className="px-2 py-1 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Sin asignar —</option>
          {(trees ?? []).map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.member_count})
            </option>
          ))}
        </select>
        <Link
          href={`/worlds/${worldId}/trees`}
          className="text-xs text-blue-600 hover:underline"
        >
          Gestionar árboles →
        </Link>
        {treeId && (
          <Link
            href={`/worlds/${worldId}/trees/${treeId}`}
            className="text-xs text-blue-600 hover:underline"
          >
            Editar este árbol →
          </Link>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* ── Render ────────────────────────────────────────────────────── */}
      {!treeId ? (
        <p className="text-xs text-gray-400 italic">
          Elegí un árbol del mundo o creá uno nuevo desde{' '}
          <Link
            href={`/worlds/${worldId}/trees`}
            className="text-blue-600 hover:underline"
          >
            la lista de árboles
          </Link>.
        </p>
      ) : loading || !tree ? (
        <p className="text-xs text-gray-400 italic">Cargando árbol…</p>
      ) : (
        <FamilyTreeRenderer
          worldId={worldId}
          members={tree.members}
          edges={tree.edges}
          partnerships={tree.partnerships}
          focusArticleId={articleId}
        />
      )}
    </div>
  )
}
