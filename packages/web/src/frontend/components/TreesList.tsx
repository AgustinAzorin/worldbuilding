'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import type { FamilyTreeSummary } from '@/lib/types'

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

interface Props {
  worldId: string
  initialTrees: FamilyTreeSummary[]
}

export function TreesList({ worldId, initialTrees }: Props) {
  const router = useRouter()
  const [trees, setTrees] = useState<FamilyTreeSummary[]>(initialTrees)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('El nombre no puede estar vacío'); return }
    setCreating(true); setError(null)
    try {
      const token = await getToken()
      const created = await api.trees.create(token, worldId, trimmed)
      setTrees(prev => [...prev, { ...created, member_count: 0, edge_count: 0 }])
      setName('')
      router.push(`/worlds/${worldId}/trees/${created.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el árbol')
    } finally {
      setCreating(false)
    }
  }, [name, router, worldId])

  const handleRemove = useCallback(async (treeId: string) => {
    if (!window.confirm('¿Eliminar este árbol y todas sus aristas?')) return
    const prev = trees
    setTrees(p => p.filter(t => t.id !== treeId))
    try {
      const token = await getToken()
      await api.trees.remove(token, treeId)
    } catch (e) {
      setTrees(prev)
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el árbol')
    }
  }, [trees])

  return (
    <div className="space-y-6">
      {/* ── Crear nuevo árbol ─────────────────────────────────────────── */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Crear un nuevo árbol</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } }}
            placeholder='Ej: "Casa de los Stark"'
            aria-label="Nombre del árbol"
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creando…' : 'Crear árbol'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </section>

      {/* ── Lista de árboles ──────────────────────────────────────────── */}
      {trees.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-10">
          No hay árboles en este mundo todavía.
        </p>
      ) : (
        <ul className="grid gap-3">
          {trees.map(t => (
            <li key={t.id}>
              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                <Link
                  href={`/worlds/${worldId}/trees/${t.id}`}
                  className="flex-1 min-w-0"
                >
                  <h3 className="font-semibold text-gray-900 truncate">{t.name}</h3>
                  {t.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {t.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {t.member_count} miembros · {t.edge_count} parentescos
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemove(t.id)}
                  aria-label={`Eliminar ${t.name}`}
                  className="text-xs text-gray-400 hover:text-red-600 px-2 py-1"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
