'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import type { OrganizationSummary } from '@/lib/types'

interface Props {
  worldId: string
  organizations: OrganizationSummary[]
}

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

interface OrgNode extends OrganizationSummary {
  children: OrgNode[]
}

/** Arma el bosque de facciones a partir de parent_id, respetando sort_order. */
function buildForest(orgs: OrganizationSummary[]): OrgNode[] {
  const byId = new Map<string, OrgNode>()
  for (const o of orgs) byId.set(o.id, { ...o, children: [] })

  const roots: OrgNode[] = []
  for (const o of orgs) {
    const node = byId.get(o.id)!
    const parent = o.parent_id ? byId.get(o.parent_id) : null
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  const sortRec = (nodes: OrgNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
    nodes.forEach(n => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

/** Devuelve el set de ids descendientes de `id` (incluyéndolo). */
function descendantsOf(id: string, orgs: OrganizationSummary[]): Set<string> {
  const childrenOf = new Map<string, string[]>()
  for (const o of orgs) {
    if (!o.parent_id) continue
    const list = childrenOf.get(o.parent_id) ?? []
    list.push(o.id)
    childrenOf.set(o.parent_id, list)
  }
  const out = new Set<string>([id])
  const stack = [id]
  while (stack.length) {
    const cur = stack.pop()!
    for (const c of childrenOf.get(cur) ?? []) {
      if (!out.has(c)) { out.add(c); stack.push(c) }
    }
  }
  return out
}

export function OrganizationsHierarchy({ worldId, organizations }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const forest = useMemo(() => buildForest(organizations), [organizations])

  const run = useCallback(async (fn: (token: string) => Promise<void>) => {
    setBusy(true); setError(null)
    try {
      const token = await getToken()
      await fn(token)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la jerarquía')
    } finally {
      setBusy(false)
    }
  }, [router])

  const setParent = useCallback((orgId: string, parentId: string | null) => {
    void run(token => api.organizations.setParent(token, orgId, parentId))
  }, [run])

  // Reordena moviendo `orgId` una posición dentro de sus hermanas.
  const move = useCallback((siblings: OrgNode[], index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= siblings.length) return
    const ids = siblings.map(s => s.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    void run(token => api.organizations.reorder(token, ids))
  }, [run])

  const renderNode = (node: OrgNode, siblings: OrgNode[], index: number, depth: number) => {
    const forbidden = descendantsOf(node.id, organizations)
    return (
      <div key={node.id}>
        <div
          className="group flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 hover:border-indigo-300 hover:shadow-sm transition-all"
          style={{ marginLeft: depth * 24 }}
        >
          <span
            aria-hidden
            className="flex-shrink-0 w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold"
          >
            {node.title.trim().charAt(0).toUpperCase() || '?'}
          </span>
          <Link
            href={`/worlds/${worldId}/articles/${node.id}`}
            className="font-medium text-gray-900 hover:text-indigo-700 truncate flex-1"
          >
            {node.title}
          </Link>

          <span className="text-[11px] text-gray-400 whitespace-nowrap">
            👥 {node.members_count}
          </span>

          {/* Reordenar entre hermanas */}
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              disabled={busy || index === 0}
              onClick={() => move(siblings, index, -1)}
              className="px-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
              title="Subir"
              aria-label="Subir"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={busy || index === siblings.length - 1}
              onClick={() => move(siblings, index, 1)}
              className="px-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
              title="Bajar"
              aria-label="Bajar"
            >
              ↓
            </button>
          </div>

          {/* Reasignar facción madre */}
          <select
            value={node.parent_id ?? ''}
            disabled={busy}
            onChange={e => setParent(node.id, e.target.value || null)}
            className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-600 max-w-[160px] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            title="Facción madre"
          >
            <option value="">— Raíz —</option>
            {organizations
              .filter(o => !forbidden.has(o.id))
              .map(o => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
          </select>
        </div>

        {node.children.length > 0 && (
          <div className="mt-2 space-y-2">
            {node.children.map((c, i) => renderNode(c, node.children, i, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {forest.map((node, i) => renderNode(node, forest, i, 0))}
    </div>
  )
}
