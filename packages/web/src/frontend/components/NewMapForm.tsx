'use client'

import { useState, useRef } from 'react'
import { uploadMapImage } from '@/lib/supabase/storage'
import type { MapSummary } from '@/lib/types'

interface Props {
  worldId: string
  onCreated: (map: MapSummary) => void
}

export function NewMapForm({ worldId, onCreated }: Props) {
  const [open, setOpen]     = useState(false)
  const [title, setTitle]   = useState('')
  const [file, setFile]     = useState<File | null>(null)
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const fileRef             = useRef<HTMLInputElement>(null)

  const reset = () => {
    setTitle('')
    setFile(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title.trim()) return
    setBusy(true)
    setError(null)

    try {
      const { url } = await uploadMapImage(worldId, file)

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sesión expirada')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? ''}/maps`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ worldId, title: title.trim(), imageUrl: url }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${res.status}`)
      }

      const created = await res.json() as MapSummary
      onCreated(created)
      reset()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white
                   text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <span aria-hidden>🗺️</span> Nuevo mapa
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row items-start sm:items-center gap-3
                 p-4 bg-white border border-blue-200 rounded-xl shadow-sm"
    >
      <input
        type="text"
        placeholder="Título del mapa"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        required
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm text-gray-600 file:mr-2 file:py-1.5 file:px-3
                   file:rounded-lg file:border-0 file:text-sm file:font-medium
                   file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100
                   cursor-pointer"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !file || !title.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg
                     hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Subiendo…' : 'Crear'}
        </button>
        <button
          type="button"
          onClick={() => { reset(); setOpen(false) }}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
