'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArticleEditor } from './editor/ArticleEditor'
import { createArticle, updateArticle } from '@/backend/actions/articles'
import type { TipTapContent } from '@/backend/types'

interface ArticleEditorFormProps {
  worldId: string
  /** Presente para edición, ausente para creación */
  articleId?: string
  initialTitle?: string
  initialContent?: TipTapContent
}

export function ArticleEditorForm({
  worldId,
  articleId,
  initialTitle = '',
  initialContent,
}: ArticleEditorFormProps) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState<TipTapContent | undefined>(initialContent)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('El título no puede estar vacío')
      return
    }

    const finalContent: TipTapContent = content ?? {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    }

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      if (articleId) {
        const result = await updateArticle(articleId, worldId, trimmedTitle, finalContent)
        if (result.error) {
          setError(result.error)
        } else {
          setSaved(true)
          setTimeout(() => setSaved(false), 2500)
        }
      } else {
        const result = await createArticle(worldId, trimmedTitle, finalContent)
        if (result.error || !result.id) {
          setError(result.error ?? 'Error al crear el artículo')
        } else {
          router.push(`/worlds/${worldId}/articles/${result.id}`)
        }
      }
    } finally {
      setSaving(false)
    }
  }, [articleId, content, router, title, worldId])

  return (
    <div className="space-y-5">
      {/* Título */}
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Título del artículo..."
        className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-gray-300 text-gray-900"
      />

      {/* Editor TipTap */}
      <ArticleEditor
        worldId={worldId}
        initialContent={initialContent}
        onChange={setContent}
      />

      {/* Acciones */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando…' : articleId ? 'Guardar cambios' : 'Crear artículo'}
        </button>

        {saved && (
          <span className="text-sm text-green-600 font-medium">Guardado</span>
        )}

        {error && (
          <span className="text-sm text-red-500">{error}</span>
        )}
      </div>
    </div>
  )
}
