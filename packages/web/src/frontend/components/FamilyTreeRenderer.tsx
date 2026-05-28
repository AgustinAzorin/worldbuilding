'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { ArticleRef, FamilyTreeEdgeRow } from '@/lib/types'

interface Props {
  worldId: string
  members: ArticleRef[]
  edges: FamilyTreeEdgeRow[]
  /** Si está presente y aparece como miembro, se resalta como "este artículo". */
  focusArticleId?: string | null
  /** Profundidad máxima a renderizar desde cada raíz (prevención de cuelgues). */
  maxDepth?: number
}

interface LayoutNode {
  articleId: string
  title: string
  depth: number
}

/**
 * Renderiza el árbol como una pila de "filas" por profundidad. Cada raíz
 * (artículo sin padre en este árbol) arranca en depth=0; los hijos se
 * acumulan en filas siguientes vía BFS. La traversía usa un `Set` de
 * visitados así que ciclos en los datos no producen render infinito,
 * aunque la API ya rechaza la creación de aristas que crearían ciclos.
 */
function layoutTree(
  members: ArticleRef[],
  edges: FamilyTreeEdgeRow[],
  maxDepth: number,
): LayoutNode[][] {
  const titleById = new Map(members.map(m => [m.id, m.title]))
  const children = new Map<string, string[]>()
  const hasParent = new Set<string>()
  for (const e of edges) {
    const list = children.get(e.parent_id) ?? []
    list.push(e.child_id)
    children.set(e.parent_id, list)
    hasParent.add(e.child_id)
  }

  const roots = members.map(m => m.id).filter(id => !hasParent.has(id))
  if (roots.length === 0) return []

  const rows: LayoutNode[][] = []
  const visited = new Set<string>()
  const queue: Array<{ id: string; depth: number }> = roots.map(id => ({ id, depth: 0 }))

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    if (visited.has(id)) continue
    if (depth > maxDepth) continue
    visited.add(id)

    const row = (rows[depth] ??= [])
    row.push({
      articleId: id,
      title: titleById.get(id) ?? '—',
      depth,
    })

    for (const child of children.get(id) ?? []) {
      if (!visited.has(child)) queue.push({ id: child, depth: depth + 1 })
    }
  }

  // Si quedaron miembros sin padre lógico pero conectados sólo como hijos
  // de ciclos huérfanos, los empujamos a una fila final para no perderlos.
  const stranded = members.filter(m => !visited.has(m.id))
  if (stranded.length > 0) {
    rows.push(stranded.map(m => ({ articleId: m.id, title: m.title, depth: rows.length })))
  }

  return rows
}

function MemberBox({
  worldId,
  node,
  highlight,
}: {
  worldId: string
  node: LayoutNode
  highlight: boolean
}) {
  const classes = highlight
    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500'
    : 'border-gray-300 bg-white text-gray-900 hover:border-blue-400 hover:shadow'
  return (
    <Link
      href={`/worlds/${worldId}/articles/${node.articleId}`}
      className={`block min-w-[120px] max-w-[180px] rounded-md border px-3 py-2 text-center text-sm font-medium truncate transition-all ${classes}`}
    >
      {node.title}
    </Link>
  )
}

export function FamilyTreeRenderer({
  worldId,
  members,
  edges,
  focusArticleId,
  maxDepth = 8,
}: Props) {
  const rows = useMemo(
    () => layoutTree(members, edges, maxDepth),
    [members, edges, maxDepth],
  )

  if (members.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic">
        Este árbol todavía no tiene miembros.
      </p>
    )
  }

  if (rows.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic">
        No se pudieron acomodar miembros — revisá las aristas del árbol.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-stretch gap-2 py-2 overflow-x-auto">
      {rows.map((row, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <div className="flex flex-wrap justify-center gap-3">
            {row.map(node => (
              <MemberBox
                key={`${idx}:${node.articleId}`}
                worldId={worldId}
                node={node}
                highlight={focusArticleId === node.articleId}
              />
            ))}
          </div>
          {idx < rows.length - 1 && (
            <div className="w-px h-6 bg-gray-300 my-1" aria-hidden />
          )}
        </div>
      ))}
    </div>
  )
}
