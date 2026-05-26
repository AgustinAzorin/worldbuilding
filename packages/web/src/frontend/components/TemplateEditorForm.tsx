'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HeaderFieldsEditor } from './HeaderFieldsEditor'
import { ModulesEditor } from './ModulesEditor'
import { createClient } from '@/lib/supabase/client'
import type { ArticleModule, HeaderField } from '@/lib/types'

interface TemplateEditorFormProps {
  worldId: string
  templateId?: string
  initialName?: string
  initialHeaderFields?: HeaderField[]
  initialModules?: ArticleModule[]
}

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

const API_URL = () => process.env.NEXT_PUBLIC_API_URL ?? ''

export function TemplateEditorForm({
  worldId,
  templateId,
  initialName = '',
  initialHeaderFields = [],
  initialModules = [],
}: TemplateEditorFormProps) {
  const [name, setName] = useState(initialName)
  const [headerFields, setHeaderFields] = useState<HeaderField[]>(initialHeaderFields)
  const [modules, setModules] = useState<ArticleModule[]>(initialModules)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const handleSave = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('El nombre no puede estar vacío'); return }

    setSaving(true); setError(null); setSaved(false)

    try {
      const token = await getToken()

      if (templateId) {
        const res = await fetch(`${API_URL()}/templates/${templateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: trimmed, headerFields, modules }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { message?: string }
          setError(err.message ?? 'Error al guardar')
        } else {
          setSaved(true); setTimeout(() => setSaved(false), 2500)
          router.refresh()
        }
      } else {
        const res = await fetch(`${API_URL()}/templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ worldId, name: trimmed, headerFields, modules }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { message?: string }
          setError(err.message ?? 'Error al crear')
        } else {
          const data = await res.json() as { id: string }
          router.push(`/worlds/${worldId}/templates/${data.id}`)
        }
      }
    } finally {
      setSaving(false)
    }
  }, [headerFields, modules, name, router, templateId, worldId])

  return (
    <div className="space-y-6">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nombre de la plantilla… (Ej: Ficha de Personaje)"
        className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-gray-300 text-gray-900"
      />

      <HeaderFieldsEditor value={headerFields} onChange={setHeaderFields} />

      <ModulesEditor
        worldId={worldId}
        articleId={null}
        articleTitle={name}
        value={modules}
        onChange={setModules}
        outgoing={[]}
        incoming={[]}
      />

      <div className="sticky bottom-4 flex items-center gap-4 pt-2 z-10">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow"
        >
          {saving ? 'Guardando…' : templateId ? 'Guardar cambios' : 'Crear plantilla'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Guardado</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  )
}
