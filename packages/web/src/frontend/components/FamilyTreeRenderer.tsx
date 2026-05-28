'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type {
  ArticleRef,
  FamilyTreeEdgeRow,
  FamilyTreePartnerRow,
  ParentRelationType,
  PartnerRelationType,
} from '@/lib/types'

interface Props {
  worldId: string
  members: ArticleRef[]
  edges: FamilyTreeEdgeRow[]
  partnerships?: FamilyTreePartnerRow[]
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

/** Etiqueta humana + estilo para los tipos de parentesco no biológicos. */
const PARENT_TAG: Record<ParentRelationType, { label: string; cls: string } | null> = {
  biological: null,
  adopted: { label: 'adoptado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  bastard: { label: 'bastardo', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
}

/** Símbolo del vínculo de pareja. */
const PARTNER_SYMBOL: Record<PartnerRelationType, string> = {
  spouse: '⚭',
  partner: '❤',
  betrothed: '💍',
}

const PARTNER_LABEL: Record<PartnerRelationType, string> = {
  spouse: 'Cónyuge',
  partner: 'Pareja',
  betrothed: 'Prometidos',
}

/**
 * Renderiza el árbol como una pila de "filas" por profundidad. Cada raíz
 * (artículo sin padre en este árbol) arranca en depth=0; los hijos se
 * acumulan en filas siguientes vía BFS. La traversía usa un `Set` de
 * visitados así que ciclos en los datos no producen render infinito.
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
  tags,
  partnerNote,
}: {
  worldId: string
  node: LayoutNode
  highlight: boolean
  tags: ParentRelationType[]
  partnerNote: string | null
}) {
  const classes = highlight
    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500'
    : 'border-gray-300 bg-white text-gray-900 hover:border-blue-400 hover:shadow'
  return (
    <div className="flex flex-col items-center gap-1">
      <Link
        href={`/worlds/${worldId}/articles/${node.articleId}`}
        className={`block min-w-[120px] max-w-[180px] rounded-md border px-3 py-2 text-center text-sm font-medium truncate transition-all ${classes}`}
      >
        {node.title}
      </Link>
      {tags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1">
          {tags.map(t => {
            const meta = PARENT_TAG[t]
            if (!meta) return null
            return (
              <span
                key={t}
                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${meta.cls}`}
              >
                {meta.label}
              </span>
            )
          })}
        </div>
      )}
      {partnerNote && (
        <span className="text-[10px] text-gray-400 truncate max-w-[180px]">{partnerNote}</span>
      )}
    </div>
  )
}

export function FamilyTreeRenderer({
  worldId,
  members,
  edges,
  partnerships = [],
  focusArticleId,
  maxDepth = 8,
}: Props) {
  const rows = useMemo(
    () => layoutTree(members, edges, maxDepth),
    [members, edges, maxDepth],
  )

  const titleById = useMemo(
    () => new Map(members.map(m => [m.id, m.title])),
    [members],
  )

  // child_id → tipos de parentesco no biológicos que apuntan a él.
  const childTags = useMemo(() => {
    const map = new Map<string, Set<ParentRelationType>>()
    for (const e of edges) {
      if (e.relation_type === 'biological') continue
      const s = map.get(e.child_id) ?? new Set<ParentRelationType>()
      s.add(e.relation_type)
      map.set(e.child_id, s)
    }
    return map
  }, [edges])

  // member_id → lista de { partnerId, type }.
  const partnersOf = useMemo(() => {
    const map = new Map<string, { partnerId: string; type: PartnerRelationType }[]>()
    const push = (a: string, b: string, type: PartnerRelationType) => {
      const list = map.get(a) ?? []
      list.push({ partnerId: b, type })
      map.set(a, list)
    }
    for (const p of partnerships) {
      push(p.member_a_id, p.member_b_id, p.relation_type)
      push(p.member_b_id, p.member_a_id, p.relation_type)
    }
    return map
  }, [partnerships])

  // articleId → índice de fila (para saber si dos parejas comparten fila).
  const rowOf = useMemo(() => {
    const map = new Map<string, number>()
    rows.forEach((row, idx) => row.forEach(n => map.set(n.articleId, idx)))
    return map
  }, [rows])

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
      {rows.map((row, idx) => {
        // Agrupamos la fila en "unidades": parejas adyacentes o nodos sueltos.
        const placed = new Set<string>()
        const units: { nodes: LayoutNode[]; symbol?: string }[] = []
        for (const node of row) {
          if (placed.has(node.articleId)) continue
          placed.add(node.articleId)
          const partners = partnersOf.get(node.articleId) ?? []
          // Buscamos una pareja presente en esta misma fila, aún sin colocar.
          const inRow = partners.find(
            p => rowOf.get(p.partnerId) === idx && !placed.has(p.partnerId),
          )
          if (inRow) {
            placed.add(inRow.partnerId)
            const partnerNode = row.find(n => n.articleId === inRow.partnerId)!
            units.push({ nodes: [node, partnerNode], symbol: PARTNER_SYMBOL[inRow.type] })
          } else {
            units.push({ nodes: [node] })
          }
        }

        return (
          <div key={idx} className="flex flex-col items-center">
            <div className="flex flex-wrap justify-center gap-3 items-start">
              {units.map((unit, ui) => (
                <div key={ui} className="flex items-start gap-1">
                  {unit.nodes.map((node, ni) => {
                    // Nota de pareja para vínculos que NO quedaron en la misma fila.
                    const partners = partnersOf.get(node.articleId) ?? []
                    const crossRow = partners.filter(p => rowOf.get(p.partnerId) !== idx)
                    const note =
                      crossRow.length > 0
                        ? `${PARTNER_LABEL[crossRow[0].type]}: ${crossRow
                            .map(p => titleById.get(p.partnerId) ?? '—')
                            .join(', ')}`
                        : null
                    return (
                      <div key={node.articleId} className="flex items-start gap-1">
                        {ni > 0 && unit.symbol && (
                          <span
                            className="self-center text-rose-500 text-lg"
                            title="Pareja"
                            aria-hidden
                          >
                            {unit.symbol}
                          </span>
                        )}
                        <MemberBox
                          worldId={worldId}
                          node={node}
                          highlight={focusArticleId === node.articleId}
                          tags={[...(childTags.get(node.articleId) ?? [])]}
                          partnerNote={note}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            {idx < rows.length - 1 && (
              <div className="w-px h-6 bg-gray-300 my-1" aria-hidden />
            )}
          </div>
        )
      })}
    </div>
  )
}
