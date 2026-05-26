'use client'

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

/**
 * Botón + diálogo para crear un Evento Histórico. Reutiliza el flow de
 * "instanciar artículo desde plantilla" (con `templateId` opcional) pero
 * además patchea el artículo recién creado con `type='event'` y los
 * metadatos temporales obligatorios.
 */
export function NewEventForm({ worldId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [startYear, setStartYear] = useState<string>('')
  const [endYear, setEndYear] = useState<string>('')
  const [dateDisplay, setDateDisplay] = useState('')
  const [templates, setTemplates] = useState<ArticleTemplateSummary[]>([])
  const [templateId, setTemplateId] = useState('')
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingTemplates(true)
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
  }, [open, worldId])

  const reset = () => {
    setTitle('')
    setStartYear('')
    setEndYear('')
    setDateDisplay('')
    setTemplateId('')
    setError(null)
  }

  const close = () => {
    if (creating) return
    setOpen(false)
    reset()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedDisplay = dateDisplay.trim()
    const parsedStart = Number.parseInt(startYear, 10)
    const parsedEnd = endYear.trim() === '' ? null : Number.parseInt(endYear, 10)

    if (!trimmedTitle) { setError('El título es obligatorio'); return }
    if (Number.isNaN(parsedStart)) { setError('El año de inicio es obligatorio'); return }
    if (!trimmedDisplay) { setError('La etiqueta de fecha es obligatoria'); return }
    if (parsedEnd !== null && Number.isNaN(parsedEnd)) {
      setError('El año de fin no es un número válido'); return
    }
    if (parsedEnd !== null && parsedEnd < parsedStart) {
      setError('El año de fin no puede ser anterior al inicio'); return
    }

    setCreating(true)
    setError(null)
    try {
      const token = await getToken()

      // 1. Instanciar el artículo (vacío o desde plantilla).
      const instRes = await fetch(`${API_URL()}/templates/instantiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          worldId,
          title: trimmedTitle,
          templateId: templateId || null,
        }),
      })
      if (!instRes.ok) {
        const err = await instRes.json().catch(() => ({})) as { message?: string }
        setError(err.message ?? 'Error al crear el evento')
        setCreating(false)
        return
      }
      const { id } = await instRes.json() as { id: string }

      // 2. Patchear `type='event'` + metadatos temporales.
      //    Necesitamos releer header_fields + modules para no pisarlos.
      const articleRes = await fetch(`${API_URL()}/articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!articleRes.ok) {
        setError('Evento creado pero no pude guardar la fecha. Editalo manualmente.')
        router.push(`/worlds/${worldId}/articles/${id}`)
        return
      }
      const fullArticle = await articleRes.json() as {
        title: string
        header_fields: unknown[]
        modules: unknown[]
      }

      const patchRes = await fetch(`${API_URL()}/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          worldId,
          title: fullArticle.title,
          headerFields: fullArticle.header_fields,
          modules: fullArticle.modules,
          type: 'event',
          startYear: parsedStart,
          endYear: parsedEnd,
          dateDisplay: trimmedDisplay,
        }),
      })
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({})) as { message?: string }
        setError(err.message ?? 'No pude guardar los datos del evento')
        setCreating(false)
        return
      }

      router.push(`/worlds/${worldId}/articles/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el evento')
      setCreating(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
      >
        + Crear Evento Histórico
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4"
          onClick={close}
        >
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Nuevo Evento Histórico</h2>
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
                Título
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="La Caída de Arendell…"
                required
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Año de inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={startYear}
                  onChange={e => setStartYear(e.target.value)}
                  placeholder="142"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Año de fin (opcional)
                </label>
                <input
                  type="number"
                  value={endYear}
                  onChange={e => setEndYear(e.target.value)}
                  placeholder="145"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Etiqueta de fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dateDisplay}
                onChange={e => setDateDisplay(e.target.value)}
                placeholder="Año 142 de la Tercera Era"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <p className="text-xs text-gray-400">
                Texto que aparecerá en grande en la línea de tiempo.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Plantilla base
              </label>
              <select
                value={templateId}
                onChange={e => setTemplateId(e.target.value)}
                disabled={loadingTemplates || creating}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                <option value="">
                  {loadingTemplates ? 'Cargando plantillas…' : 'Sin plantilla (evento vacío)'}
                </option>
                {templates.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                ))}
              </select>
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
                className="px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creando…' : 'Crear evento'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
