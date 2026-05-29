'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { uploadMapImage } from '@/lib/supabase/storage'

interface Props {
  worldId: string
}

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

/** Botón + diálogo para subir la imagen de un mapa y crear su registro. */
export function UploadMapForm({ worldId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setTitle('')
    setFile(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const close = () => {
    if (uploading) return
    setOpen(false)
    reset()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) { setError('El título es obligatorio'); return }
    if (!file) { setError('Seleccioná una imagen para el mapa'); return }

    setUploading(true)
    setError(null)
    try {
      // 1. Subir la imagen al bucket público `map-images`.
      const { url } = await uploadMapImage(worldId, file)
      // 2. Crear el registro del mapa apuntando a la URL pública.
      const token = await getToken()
      const map = await api.maps.create(token, worldId, trimmed, url)
      setOpen(false)
      reset()
      router.push(`/worlds/${worldId}/maps/${map.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pude subir el mapa')
      setUploading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        + Subir mapa
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={close}
        >
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Subir mapa</h2>
              <button
                type="button"
                onClick={close}
                className="text-2xl leading-none text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Título
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="El Reino de Eldoria…"
                required
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Imagen del mapa
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-400">PNG, JPG, WEBP, GIF o SVG · hasta 25 MB.</p>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={close}
                disabled={uploading}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Subiendo…' : 'Subir mapa'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
