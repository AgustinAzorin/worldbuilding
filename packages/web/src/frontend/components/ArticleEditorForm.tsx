'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HeaderFieldsEditor } from './HeaderFieldsEditor'
import { ModulesEditor } from './ModulesEditor'
import { createClient } from '@/lib/supabase/client'
import type { ArticleModule, ArticleRef, HeaderField } from '@/lib/types'

interface ArticleEditorFormProps {
  worldId: string
  articleId?: string
  initialTitle?: string
  initialHeaderFields?: HeaderField[]
  initialModules?: ArticleModule[]
  initialOutgoing?: ArticleRef[]
  initialIncoming?: ArticleRef[]
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
  initialHeaderFields = [],
  initialModules = [],
  initialOutgoing = [],
  initialIncoming = [],
}: ArticleEditorFormProps) {
  const [title, setTitle] = useState(initialTitle)
  const [headerFields, setHeaderFields] = useState<HeaderField[]>(initialHeaderFields)
  const [modules, setModules] = useState<ArticleModule[]>(initialModules)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) { setError('El título no puede estar vacío'); return }

    setSaving(true); setError(null); setSaved(false)

    try {
      const token = await getToken()
      const payload = {
        worldId,
        title: trimmedTitle,
        headerFields,
        modules,
      }

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
          router.refresh()
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
  }, [articleId, headerFields, modules, router, title, worldId])

  return (
    <div className="space-y-6">
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Título del artículo..."
        className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-gray-300 text-gray-900"
      />

      <HeaderFieldsEditor value={headerFields} onChange={setHeaderFields} />

      <ModulesEditor
        worldId={worldId}
        articleId={articleId ?? null}
        articleTitle={title}
        value={modules}
        onChange={setModules}
        outgoing={initialOutgoing}
        incoming={initialIncoming}
      />

      <div className="sticky bottom-4 flex items-center gap-4 pt-2 z-10">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow"
        >
          {saving ? 'Guardando…' : articleId ? 'Guardar cambios' : 'Crear artículo'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Guardado</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  )
}
