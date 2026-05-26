'use client'

import { useCallback, useRef, useState } from 'react'
import { uploadArticleImage } from '@/lib/supabase/storage'
import type { ImageModule } from '@/lib/types'

interface Props {
  worldId: string
  module: ImageModule
  onChange: (next: ImageModule) => void
}

export function ImageModuleView({ worldId, module, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true); setError(null)
    try {
      const { url, path } = await uploadArticleImage(worldId, file)
      onChange({ ...module, data: { ...module.data, url, path, alt: module.data.alt || file.name } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la imagen')
    } finally {
      setUploading(false)
    }
  }, [worldId, module, onChange])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void handleUpload(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
    if (file) void handleUpload(file)
  }

  return (
    <div className="space-y-2">
      {module.data.url ? (
        <figure className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={module.data.url}
            alt={module.data.alt}
            className="max-w-full rounded-md border border-gray-200"
          />
          <input
            type="text"
            value={module.data.alt}
            onChange={e => onChange({ ...module, data: { ...module.data, alt: e.target.value } })}
            placeholder="Texto alternativo (alt)"
            className="w-full text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={() => onChange({ ...module, data: { url: null, path: null, alt: '' } })}
            className="text-xs text-red-600 hover:underline"
          >
            Quitar imagen
          </button>
        </figure>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-1 px-4 py-8 rounded-md border-2 border-dashed cursor-pointer transition-colors ${
            dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <span className="text-sm font-medium text-gray-600">
            {uploading ? 'Subiendo…' : 'Soltá una imagen o hacé clic para seleccionar'}
          </span>
          <span className="text-xs text-gray-400">PNG, JPG, WEBP, GIF — máx 10 MB</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      )}
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  )
}
