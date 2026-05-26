'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArticleEditor } from './editor/ArticleEditor'
import { MetadataPanel } from './MetadataPanel'
import { createClient } from '@/lib/supabase/client'
import type { ArticleMetadata, TipTapContent } from '@/lib/types'

interface ArticleEditorFormProps {
  worldId: string
  articleId?: string
  initialTitle?: string
  initialContent?: TipTapContent
  initialMetadata?: ArticleMetadata
}

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

const API_URL = () => process.env.NEXT_PUBLIC_API_URL ?? ''

export function ArticleEditorForm({
  worldId,
  articleId,
  initialTitle = '',
  initialContent,
  initialMetadata = {},
}: ArticleEditorFormProps) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState<TipTapContent | undefined>(initialContent)
  const [metadata, setMetadata] = useState<ArticleMetadata>(initialMetadata)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) { setError('El título no puede estar vacío'); return }

    const finalContent: TipTapContent = content ?? { type: 'doc', content: [{ type: 'paragraph' }] }
    setSaving(true); setError(null); setSaved(false)

    try {
      const token = await getToken()
      const payload = { worldId, title: trimmedTitle, content: finalContent, metadata }

      if (articleId) {
        const res = await fetch(`${API_URL()}/articles/${articleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { message?: string }
          setError(err.message ?? 'Error al guardar')
        } else {
          setSaved(true); setTimeout(() => setSaved(false), 2500)
        }
      } else {
        const res = await fetch(`${API_URL()}/articles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { message?: string }
          setError(err.message ?? 'Error al crear')
        } else {
          const data = await res.json() as { id: string }
          router.push(`/worlds/${worldId}/articles/${data.id}`)
        }
      }
    } finally {
      setSaving(false)
    }
  }, [articleId, content, metadata, router, title, worldId])

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-5 min-w-0">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título del artículo..."
          className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-gray-300 text-gray-900"
        />

        <ArticleEditor worldId={worldId} initialContent={initialContent} onChange={setContent} />

        <div className="flex items-center gap-4 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando…' : articleId ? 'Guardar cambios' : 'Crear artículo'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Guardado</span>}
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      </div>

      <MetadataPanel
        value={initialMetadata}
        onChange={setMetadata}
        className="lg:sticky lg:top-6 self-start"
      />
    </div>
  )
}
