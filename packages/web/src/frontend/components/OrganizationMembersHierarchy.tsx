'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import type { OrganizationMember } from '@/lib/types'

interface Props {
  worldId: string
  orgId: string
}

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

interface MemberNode extends OrganizationMember {
  children: MemberNode[]
}

/**
 * Arma el organigrama a partir de `reportsToMemberId`. Un miembro es raíz
 * cuando no reporta a nadie o cuando su superior no existe en el roster.
 * Dentro de cada nivel se ordena por nivel de rango y luego por título.
 */
function buildForest(members: OrganizationMember[]): MemberNode[] {
  const byId = new Map<string, MemberNode>()
  for (const m of members) byId.set(m.memberId, { ...m, children: [] })

  const roots: MemberNode[] = []
  for (const m of members) {
    const node = byId.get(m.memberId)!
    const superior = m.reportsToMemberId ? byId.get(m.reportsToMemberId) : null
    if (superior && superior.memberId !== m.memberId) superior.children.push(node)
    else roots.push(node)
  }

  const sortRec = (nodes: MemberNode[]) => {
    nodes.sort(
      (a, b) => a.rankLevel - b.rankLevel || a.memberTitle.localeCompare(b.memberTitle),
    )
    nodes.forEach(n => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

/** Set de ids subordinados de `id` (incluyéndolo) — no pueden ser su jefe. */
function descendantsOf(id: string, members: OrganizationMember[]): Set<string> {
  const childrenOf = new Map<string, string[]>()
  for (const m of members) {
    if (!m.reportsToMemberId) continue
    const list = childrenOf.get(m.reportsToMemberId) ?? []
    list.push(m.memberId)
    childrenOf.set(m.reportsToMemberId, list)
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

/**
 * Vista que se muestra en la ficha de una organización: lista a sus
 * miembros como un organigrama (cadena de mando vía "reporta a") donde
 * cada miembro lleva además su cargo y nivel jerárquico, todo editable.
 */
export function OrganizationMembersHierarchy({ worldId, orgId }: Props) {
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      setMembers(await api.organizations.members(token, orgId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los miembros')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { void load() }, [load])

  const forest = useMemo(() => buildForest(members), [members])

  /** Persiste un parche y refleja el resultado en memoria; revierte si falla. */
  const patch = useCallback(
    async (
      relationId: string,
      change: { rank?: string | null; rankLevel?: number; reportsToMemberId?: string | null },
    ) => {
      const prev = members
      setMembers(p =>
        p.map(m =>
          m.relationId === relationId
            ? {
                ...m,
                ...(change.rank !== undefined ? { rank: change.rank } : {}),
                ...(change.rankLevel !== undefined ? { rankLevel: change.rankLevel } : {}),
                ...(change.reportsToMemberId !== undefined
                  ? { reportsToMemberId: change.reportsToMemberId }
                  : {}),
              }
            : m,
        ),
      )
      setBusy(true); setError(null)
      try {
        const token = await getToken()
        await api.organizations.updateMembership(token, relationId, change)
      } catch (e) {
        setMembers(prev)
        setError(e instanceof Error ? e.message : 'No se pudo actualizar la membresía')
      } finally {
        setBusy(false)
      }
    },
    [members],
  )

  const renderNode = (node: MemberNode, depth: number) => {
    const forbidden = descendantsOf(node.memberId, members)
    return (
      <div key={node.relationId}>
        <div
          className="group flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 hover:border-indigo-300 hover:shadow-sm transition-all"
          style={{ marginLeft: depth * 24 }}
        >
          <span
            aria-hidden
            className="flex-shrink-0 w-8 h-8 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-sm font-bold"
          >
            {node.memberTitle.trim().charAt(0).toUpperCase() || '?'}
          </span>

          <Link
            href={`/worlds/${worldId}/articles/${node.memberId}`}
            className="font-medium text-gray-900 hover:text-indigo-700 truncate"
          >
            {node.memberTitle}
          </Link>

          {node.rank && (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-medium">
              {node.rank}
            </span>
          )}
          <span className="text-[11px] text-gray-400" title="Nivel jerárquico (menor = más alto)">
            nivel {node.rankLevel}
          </span>

          <div className="flex-1" />

          {/* Editores inline (aparecen al pasar el cursor) */}
          <div className="flex flex-wrap items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <input
              type="text"
              defaultValue={node.rank ?? ''}
              disabled={busy}
              onBlur={e => {
                const v = e.target.value.trim()
                if (v !== (node.rank ?? '')) void patch(node.relationId, { rank: v || null })
              }}
              placeholder="Cargo…"
              aria-label={`Cargo de ${node.memberTitle}`}
              className="w-24 text-xs border border-gray-200 rounded px-1.5 py-1 bg-white"
            />
            <input
              type="number"
              min={0}
              defaultValue={node.rankLevel}
              disabled={busy}
              onBlur={e => {
                const v = Math.max(0, Number.parseInt(e.target.value, 10) || 0)
                if (v !== node.rankLevel) void patch(node.relationId, { rankLevel: v })
              }}
              aria-label={`Nivel de ${node.memberTitle}`}
              className="w-14 text-xs border border-gray-200 rounded px-1.5 py-1 bg-white"
            />
            <select
              value={node.reportsToMemberId ?? ''}
              disabled={busy}
              onChange={e =>
                void patch(node.relationId, { reportsToMemberId: e.target.value || null })
              }
              title="Reporta a"
              aria-label={`Superior de ${node.memberTitle}`}
              className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-600 max-w-[160px]"
            >
              <option value="">— Cima —</option>
              {members
                .filter(m => !forbidden.has(m.memberId))
                .map(m => (
                  <option key={m.memberId} value={m.memberId}>{m.memberTitle}</option>
                ))}
            </select>
          </div>
        </div>

        {node.children.length > 0 && (
          <div className="mt-2 space-y-2">
            {node.children.map(c => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Jerarquía de miembros</h2>
        <p className="text-xs text-gray-500">
          Organigrama de quienes son <span className="font-mono">Miembro de</span> esta
          organización. Pasá el cursor sobre cada fila para fijar su cargo, nivel y a quién reporta.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-xs text-gray-400 italic">Cargando miembros…</p>
      ) : members.length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          Ningún artículo declara ser miembro de esta organización todavía. Agregá la membresía
          desde el bloque correspondiente en la ficha del personaje.
        </p>
      ) : (
        <div className="space-y-2">
          {forest.map(node => renderNode(node, 0))}
        </div>
      )}
    </section>
  )
}
