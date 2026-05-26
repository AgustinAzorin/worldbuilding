'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ArticleTemplateSummary } from '@/lib/types'

interface Props {
  worldId: string
}

const API_URL = () => process.env.NEXT_PUBLIC_API_URL ?? ''

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

export function NewArticleForm({ worldId }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [templates, setTemplates] = useState<ArticleTemplateSummary[]>([])
  const [templateId, setTemplateId] = useState<string>('')
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        const res = await fetch(
          `${API_URL()}/templates?worldId=${encodeURIComponent(worldId)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!res.ok) return
        const data = await res.json() as ArticleTemplateSummary[]
        if (!cancelled) setTemplates(data)
      } finally {
        if (!cancelled) setLoadingTemplates(false)
      }
    })()
    return () => { cancelled = true }
  }, [worldId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) { setError('El título es obligatorio'); return }

    setCreating(true); setError(null)
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL()}/templates/instantiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          worldId,
          title: trimmed,
          templateId: templateId || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string }
        setError(err.message ?? 'Error al crear el artículo')
        setCreating(false)
        return
      }
      const data = await res.json() as { id: string }
      router.push(`/worlds/${worldId}/articles/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el artículo')
      setCreating(false)
    }
  }

  const selectedTemplate = templates.find(t => t.id === templateId)

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 p-6 bg-white rounded-xl border border-gray-200 shadow-sm"
    >
      <h1 className="text-2xl font-bold text-gray-900">Nuevo artículo</h1>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Título
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Nombre del artículo…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          autoFocus
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Cargar plantilla
        </label>
        <select
          value={templateId}
          onChange={e => setTemplateId(e.target.value)}
          disabled={loadingTemplates || creating}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        >
          <option value="">
            {loadingTemplates ? 'Cargando plantillas…' : 'Sin plantilla (artículo vacío)'}
          </option>
          {templates.map(tpl => (
            <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
          ))}
        </select>
        {!loadingTemplates && templates.length === 0 && (
          <p className="text-xs text-gray-400">
            No tenés plantillas todavía.{' '}
            <Link
              href={`/worlds/${worldId}/templates/new`}
              className="text-blue-600 hover:underline"
            >
              Crear una
            </Link>
          </p>
        )}
        {selectedTemplate && (
          <p className="text-xs text-gray-500">
            Se clonarán los campos y módulos de <strong>{selectedTemplate.name}</strong> con
            IDs nuevos.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={creating}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {creating
            ? selectedTemplate
              ? `Creando desde “${selectedTemplate.name}”…`
              : 'Creando…'
            : 'Crear artículo'}
        </button>
        <Link
          href={`/worlds/${worldId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancelar
        </Link>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </form>
  )
}
