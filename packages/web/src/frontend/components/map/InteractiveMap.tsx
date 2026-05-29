'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  PIN_TYPES,
  PIN_TYPE_META,
  type ArticleSuggestion,
  type MapPin,
  type PinType,
} from '@/lib/types'
import { ArticleCombobox } from './ArticleCombobox'

// Leaflet toca `window` → debe cargarse SÓLO en cliente (sin SSR).
const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
      Cargando visor…
    </div>
  ),
})

interface Props {
  worldId: string
  mapId: string
  imageUrl: string
  initialPins: MapPin[]
}

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

interface Draft {
  x: number
  y: number
  title: string
  pinType: PinType
  article: ArticleSuggestion | null
}

export function InteractiveMap({ worldId, mapId, imageUrl, initialPins }: Props) {
  const router = useRouter()
  const [pins, setPins] = useState<MapPin[]>(initialPins)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Interacción con el lienzo ─────────────────────────────────────────────

  const handleMapClick = useCallback((rel: { x: number; y: number }) => {
    setError(null)
    setDraft({ x: rel.x, y: rel.y, title: '', pinType: 'location', article: null })
  }, [])

  const handlePinClick = useCallback(
    (pin: MapPin) => {
      if (editMode) {
        setSelectedPin(pin)
        return
      }
      // Modo lectura: si el pin enlaza un artículo, lo abrimos.
      if (pin.article_id) {
        router.push(`/worlds/${worldId}/articles/${pin.article_id}`)
      }
    },
    [editMode, router, worldId],
  )

  // ── Persistencia ──────────────────────────────────────────────────────────

  async function savePin() {
    if (!draft) return
    const title = draft.title.trim() || draft.article?.title.trim() || ''
    if (!title) {
      setError('Escribí un título o enlazá un artículo')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const token = await getToken()
      const created = await api.maps.savePin(token, mapId, {
        title,
        articleId: draft.article?.id ?? null,
        x: draft.x,
        y: draft.y,
        pinType: draft.pinType,
      })
      setPins(prev => [...prev, created])
      setDraft(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pude guardar el marcador')
    } finally {
      setBusy(false)
    }
  }

  async function deletePin(pin: MapPin) {
    setBusy(true)
    setError(null)
    try {
      const token = await getToken()
      await api.maps.deletePin(token, pin.id)
      setPins(prev => prev.filter(p => p.id !== pin.id))
      setSelectedPin(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pude eliminar el marcador')
    } finally {
      setBusy(false)
    }
  }

  const draftPin = useMemo(
    () => (draft ? { x: draft.x, y: draft.y, pinType: draft.pinType } : null),
    [draft],
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
        <button
          type="button"
          onClick={() => {
            setEditMode(v => !v)
            setDraft(null)
            setSelectedPin(null)
          }}
          className={
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ' +
            (editMode
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50')
          }
        >
          {editMode ? '✓ Modo edición' : '✎ Editar marcadores'}
        </button>

        {editMode && (
          <span className="text-xs text-gray-500">
            Hacé click en el mapa para colocar un marcador.
          </span>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {PIN_TYPES.map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: PIN_TYPE_META[t].color }}
              />
              {PIN_TYPE_META[t].label}
            </span>
          ))}
          <span className="text-gray-400">·</span>
          <span>{pins.length} {pins.length === 1 ? 'marcador' : 'marcadores'}</span>
        </div>
      </div>

      {/* Lienzo */}
      <div className="relative min-h-0 flex-1">
        <MapInner
          imageUrl={imageUrl}
          pins={pins}
          editMode={editMode}
          draftPin={draftPin}
          onMapClick={handleMapClick}
          onPinClick={handlePinClick}
        />
      </div>

      {/* Modal: nuevo marcador */}
      {draft && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4"
          onClick={() => !busy && setDraft(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Nuevo marcador</h2>
              <button
                type="button"
                onClick={() => !busy && setDraft(null)}
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
                autoFocus
                value={draft.title}
                onChange={e => setDraft({ ...draft, title: e.target.value })}
                placeholder="Nombre del marcador…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Enlazar artículo (opcional)
              </label>
              <ArticleCombobox
                worldId={worldId}
                value={draft.article}
                disabled={busy}
                onChange={article =>
                  setDraft(d =>
                    d
                      ? {
                          ...d,
                          article,
                          // Autocompleta el título si todavía está vacío.
                          title: d.title.trim() === '' && article ? article.title : d.title,
                        }
                      : d,
                  )
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tipo de marcador
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {PIN_TYPES.map(t => {
                  const active = draft.pinType === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDraft({ ...draft, pinType: t })}
                      title={PIN_TYPE_META[t].label}
                      className={
                        'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[10px] font-medium transition-colors ' +
                        (active
                          ? 'border-transparent text-white'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50')
                      }
                      style={active ? { background: PIN_TYPE_META[t].color } : undefined}
                    >
                      <span className="text-base leading-none">{PIN_TYPE_META[t].emoji}</span>
                      {PIN_TYPE_META[t].label}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => !busy && setDraft(null)}
                disabled={busy}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={savePin}
                disabled={busy}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? 'Guardando…' : 'Guardar marcador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup: marcador existente (en modo edición) */}
      {selectedPin && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4"
          onClick={() => !busy && setSelectedPin(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{PIN_TYPE_META[selectedPin.pin_type].emoji}</span>
              <h2 className="truncate text-lg font-bold text-gray-900">{selectedPin.title}</h2>
            </div>
            <p className="text-sm text-gray-500">
              {PIN_TYPE_META[selectedPin.pin_type].label}
              {selectedPin.article ? ` · enlazado a “${selectedPin.article.title}”` : ''}
            </p>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              {selectedPin.article_id ? (
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/worlds/${worldId}/articles/${selectedPin.article_id}`)
                  }
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Abrir artículo →
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => !busy && setSelectedPin(null)}
                  disabled={busy}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => deletePin(selectedPin)}
                  disabled={busy}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {busy ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
