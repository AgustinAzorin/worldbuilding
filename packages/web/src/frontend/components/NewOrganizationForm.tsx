'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  worldId: string
}

const API_URL = () => process.env.NEXT_PUBLIC_API_URL ?? ''

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

/**
 * Botón + diálogo para crear rápidamente una Organización. Reutiliza el
 * flow de "instanciar artículo" (vacío) y luego patchea `type='organization'`,
 * igual que NewEventForm hace para los eventos históricos.
 */
export function NewOrganizationForm({ worldId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setTitle('')
    setError(null)
  }

  const close = () => {
    if (creating) return
    setOpen(false)
    reset()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) { setError('El nombre es obligatorio'); return }

    setCreating(true); setError(null)
    try {
      const token = await getToken()

      // 1. Instanciar artículo vacío.
      const instRes = await fetch(`${API_URL()}/templates/instantiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ worldId, title: trimmed, templateId: null }),
      })
      if (!instRes.ok) {
        const err = await instRes.json().catch(() => ({})) as { message?: string }
        setError(err.message ?? 'No pude crear la organización')
        setCreating(false)
        return
      }
      const { id } = await instRes.json() as { id: string }

      // 2. Patchear type='organization' (manteniendo header_fields/modules vacíos).
      const patchRes = await fetch(`${API_URL()}/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          worldId,
          title: trimmed,
          headerFields: [],
          modules: [],
          type: 'organization',
        }),
      })
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({})) as { message?: string }
        setError(err.message ?? 'Organización creada pero no pude marcarla como tal')
        setCreating(false)
        return
      }

      router.push(`/worlds/${worldId}/articles/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la organización')
      setCreating(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
      >
        + Nueva organización
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4"
          onClick={close}
        >
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Nueva organización</h2>
              <button
                type="button"
                onClick={close}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Nombre
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Gremio de los Sabios…"
                required
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400">
                Podrás añadir campos, descripción y miembros desde el editor.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={close}
                disabled={creating}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creando…' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
