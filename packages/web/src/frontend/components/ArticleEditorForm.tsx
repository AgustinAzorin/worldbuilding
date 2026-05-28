'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HeaderFieldsEditor } from './HeaderFieldsEditor'
import { ModulesEditor } from './ModulesEditor'
import { OrganizationMembersHierarchy } from './OrganizationMembersHierarchy'
import { createClient } from '@/lib/supabase/client'
import type { ArticleModule, ArticleRelationEdge, ArticleType, HeaderField } from '@/lib/types'

interface ArticleEditorFormProps {
  worldId: string
  articleId?: string
  initialTitle?: string
  initialHeaderFields?: HeaderField[]
  initialModules?: ArticleModule[]
  initialOutgoing?: ArticleRelationEdge[]
  initialIncoming?: ArticleRelationEdge[]
  initialType?: ArticleType
  initialStartYear?: number | null
  initialEndYear?: number | null
  initialDateDisplay?: string | null
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
  initialType = 'document',
  initialStartYear = null,
  initialEndYear = null,
  initialDateDisplay = null,
}: ArticleEditorFormProps) {
  const [title, setTitle] = useState(initialTitle)
  const [headerFields, setHeaderFields] = useState<HeaderField[]>(initialHeaderFields)
  const [modules, setModules] = useState<ArticleModule[]>(initialModules)
  const [articleType, setArticleType] = useState<ArticleType>(initialType)
  const [startYear, setStartYear] = useState<string>(
    initialStartYear !== null ? String(initialStartYear) : '',
  )
  const [endYear, setEndYear] = useState<string>(
    initialEndYear !== null ? String(initialEndYear) : '',
  )
  const [dateDisplay, setDateDisplay] = useState<string>(initialDateDisplay ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) { setError('El título no puede estar vacío'); return }

    // Validación de metadatos de evento.
    const parsedStart = startYear.trim() === '' ? null : Number.parseInt(startYear, 10)
    const parsedEnd   = endYear.trim()   === '' ? null : Number.parseInt(endYear, 10)
    const trimmedDisplay = dateDisplay.trim()

    if (articleType === 'event') {
      if (parsedStart === null || Number.isNaN(parsedStart)) {
        setError('Un evento requiere un año de inicio válido'); return
      }
      if (!trimmedDisplay) {
        setError('Un evento requiere una etiqueta de fecha (date_display)'); return
      }
      if (parsedEnd !== null && (Number.isNaN(parsedEnd) || parsedEnd < parsedStart)) {
        setError('El año de fin no es válido o es anterior al inicio'); return
      }
    }

    setSaving(true); setError(null); setSaved(false)

    try {
      const token = await getToken()
      const payload = {
        worldId,
        title: trimmedTitle,
        headerFields,
        modules,
        type: articleType,
        startYear: articleType === 'event' ? parsedStart : null,
        endYear:   articleType === 'event' ? parsedEnd   : null,
        dateDisplay: articleType === 'event' ? trimmedDisplay : null,
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
  }, [
    articleId,
    articleType,
    dateDisplay,
    endYear,
    headerFields,
    modules,
    router,
    startYear,
    title,
    worldId,
  ])

  return (
    <div className="space-y-6">
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Título del artículo..."
        className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-gray-300 text-gray-900"
      />

      {/* ── Selector de tipo + metadatos de evento ─────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-gray-700">Tipo:</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="article-type"
              checked={articleType === 'document'}
              onChange={() => setArticleType('document')}
              className="accent-blue-600"
            />
            <span className="text-blue-600 font-medium">Documento</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="article-type"
              checked={articleType === 'event'}
              onChange={() => setArticleType('event')}
              className="accent-red-600"
            />
            <span className="text-red-600 font-medium">Evento histórico</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="article-type"
              checked={articleType === 'organization'}
              onChange={() => setArticleType('organization')}
              className="accent-indigo-600"
            />
            <span className="text-indigo-600 font-medium">Organización</span>
          </label>
        </div>

        {articleType === 'event' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Año inicio <span className="text-red-500">*</span>
              </span>
              <input
                type="number"
                value={startYear}
                onChange={e => setStartYear(e.target.value)}
                placeholder="142"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Año fin
              </span>
              <input
                type="number"
                value={endYear}
                onChange={e => setEndYear(e.target.value)}
                placeholder="opcional"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Etiqueta <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={dateDisplay}
                onChange={e => setDateDisplay(e.target.value)}
                placeholder="Año 142 de la Tercera Era"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </label>
          </div>
        )}
      </div>

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

      {articleType === 'organization' && articleId && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <OrganizationMembersHierarchy worldId={worldId} orgId={articleId} />
        </div>
      )}

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
