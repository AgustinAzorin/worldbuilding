'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { MapPin, MapWithPins, PinType, ArticleSuggestion } from '@/lib/types'
import { useRouter } from 'next/navigation'

// ── Pin visual config ─────────────────────────────────────────────────────

const PIN_CONFIG: Record<PinType, { bg: string; border: string; emoji: string; label: string }> = {
  npc:      { bg: 'bg-red-500',    border: 'border-red-700',    emoji: '👤', label: 'NPC' },
  item:     { bg: 'bg-yellow-400', border: 'border-yellow-600', emoji: '🗡️', label: 'Ítem' },
  event:    { bg: 'bg-purple-500', border: 'border-purple-700', emoji: '⚡', label: 'Evento' },
  faction:  { bg: 'bg-green-500',  border: 'border-green-700',  emoji: '🏛️', label: 'Facción' },
  location: { bg: 'bg-blue-500',   border: 'border-blue-700',   emoji: '📍', label: 'Ubicación' },
}

// ── Types ─────────────────────────────────────────────────────────────────

interface PinFormState {
  x: number
  y: number
  title: string
  pinType: PinType
  articleId: string | null
  articleQuery: string
}

interface Props {
  mapData: MapWithPins
  worldId: string
  editMode: boolean
  onSavePin: (pin: {
    mapId: string
    articleId: string | null
    title: string
    x: number
    y: number
    pinType: PinType
  }) => Promise<MapPin>
  onDeletePin: (pinId: string) => Promise<void>
}

// ── Component ─────────────────────────────────────────────────────────────

export default function InteractiveMapInner({
  mapData,
  worldId,
  editMode,
  onSavePin,
  onDeletePin,
}: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const leafletRef   = useRef<{
    map: import('leaflet').Map
    overlay: import('leaflet').ImageOverlay
  } | null>(null)

  const [pins, setPins]           = useState<MapPin[]>(mapData.pins)
  const [form, setForm]           = useState<PinFormState | null>(null)
  const [saving, setSaving]       = useState(false)
  const [suggestions, setSuggestions] = useState<ArticleSuggestion[]>([])
  const [loadingSug, setLoadingSug]   = useState(false)
  const [imgSize, setImgSize]     = useState<{ w: number; h: number } | null>(null)

  // ── Resolve image natural size ─────────────────────────────────────────

  useEffect(() => {
    const img = new window.Image()
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = mapData.image_url
  }, [mapData.image_url])

  // ── Init / destroy Leaflet ─────────────────────────────────────────────

  useEffect(() => {
    if (!imgSize || !containerRef.current) return
    if (leafletRef.current) return // already initialised

    // Lazy-load leaflet (browser only)
    import('leaflet').then((L) => {
      // Fix marker icon paths that webpack breaks
      // (not needed for custom DivIcon, just silencing the default)
      const container = containerRef.current!
      const { w, h } = imgSize

      const map = L.map(container, {
        crs: L.CRS.Simple,
        minZoom: -3,
        maxZoom: 3,
        zoomSnap: 0.25,
        attributionControl: false,
      })

      const bounds: import('leaflet').LatLngBoundsExpression = [[0, 0], [h, w]]

      L.imageOverlay(mapData.image_url, bounds).addTo(map)
      map.fitBounds(bounds)
      map.setMaxBounds(bounds.map(b => {
        const [lat, lng] = b as [number, number]
        return [lat - h * 0.3, lng - w * 0.3] as [number, number]
      }) as import('leaflet').LatLngBoundsExpression)

      leafletRef.current = { map, overlay: map.getPane('overlayPane') as unknown as import('leaflet').ImageOverlay }

      // Click handler para modo edición
      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        if (!editMode) return
        const { lat, lng } = e.latlng
        // Normalizar a 0-100 relativo al tamaño de la imagen
        const xPct = Math.max(0, Math.min(100, (lng / w) * 100))
        const yPct = Math.max(0, Math.min(100, (lat / h) * 100))

        setForm({
          x: parseFloat(xPct.toFixed(4)),
          y: parseFloat(yPct.toFixed(4)),
          title: '',
          pinType: 'location',
          articleId: null,
          articleQuery: '',
        })
      })

      leafletRef.current = { map, overlay: null as unknown as import('leaflet').ImageOverlay }
    })

    return () => {
      leafletRef.current?.map.remove()
      leafletRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSize])

  // ── Re-attach click when editMode changes ─────────────────────────────

  useEffect(() => {
    const mapObj = leafletRef.current?.map
    if (!mapObj || !imgSize) return

    mapObj.off('click')
    if (editMode) {
      const { w, h } = imgSize
      mapObj.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        const { lat, lng } = e.latlng
        const xPct = Math.max(0, Math.min(100, (lng / w) * 100))
        const yPct = Math.max(0, Math.min(100, (lat / h) * 100))
        setForm({
          x: parseFloat(xPct.toFixed(4)),
          y: parseFloat(yPct.toFixed(4)),
          title: '',
          pinType: 'location',
          articleId: null,
          articleQuery: '',
        })
      })
    }
  }, [editMode, imgSize])

  // ── Render pins as DivMarkers ─────────────────────────────────────────

  useEffect(() => {
    const mapObj = leafletRef.current?.map
    if (!mapObj || !imgSize) return

    import('leaflet').then((L) => {
      // Clear existing pin markers (we re-create on every pins change)
      mapObj.eachLayer((layer) => {
        if ((layer as { _isPin?: boolean })._isPin) mapObj.removeLayer(layer)
      })

      const { w, h } = imgSize

      pins.forEach((pin) => {
        const cfg = PIN_CONFIG[pin.pin_type] ?? PIN_CONFIG.location
        const latLng: import('leaflet').LatLngExpression = [
          (pin.y / 100) * h,
          (pin.x / 100) * w,
        ]

        const icon = L.divIcon({
          className: '',
          html: `
            <div class="relative group" style="transform:translate(-50%,-100%)">
              <div class="w-8 h-8 rounded-full flex items-center justify-center
                          border-2 shadow-lg cursor-pointer transition-transform
                          hover:scale-125 ${cfg.bg} ${cfg.border} text-white text-sm select-none">
                ${cfg.emoji}
              </div>
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1
                          bg-gray-900 text-white text-xs px-2 py-1 rounded
                          whitespace-nowrap opacity-0 group-hover:opacity-100
                          pointer-events-none transition-opacity shadow">
                ${pin.title}
              </div>
            </div>`,
          iconSize: [32, 32],
          iconAnchor: [0, 0],
        })

        const marker = L.marker(latLng, { icon })
        ;(marker as unknown as { _isPin: boolean })._isPin = true

        marker.on('click', (e: import('leaflet').LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e)
          if (pin.article_id) {
            router.push(`/articles/${pin.article_id}`)
          }
        })

        if (editMode) {
          marker.on('contextmenu', async (e: import('leaflet').LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e)
            if (!confirm(`¿Eliminar el marcador "${pin.title}"?`)) return
            await onDeletePin(pin.id)
            setPins((prev) => prev.filter((p) => p.id !== pin.id))
          })
        }

        marker.addTo(mapObj)
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, imgSize, editMode])

  // ── Article suggestion search ─────────────────────────────────────────

  const searchArticles = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); return }
    setLoadingSug(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? ''}/articles/search?worldId=${worldId}&q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      )
      const data = await res.json() as ArticleSuggestion[]
      setSuggestions(data)
    } finally {
      setLoadingSug(false)
    }
  }, [worldId])

  // ── Save pin handler ─────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form || !form.title.trim()) return
    setSaving(true)
    try {
      const saved = await onSavePin({
        mapId: mapData.id,
        articleId: form.articleId,
        title: form.title,
        x: form.x,
        y: form.y,
        pinType: form.pinType,
      })
      setPins((prev) => [...prev, saved])
      setForm(null)
      setSuggestions([])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative w-full h-full">
      {/* Leaflet container */}
      <div ref={containerRef} className="w-full h-full bg-gray-800 rounded-lg" />

      {/* Pin form modal */}
      {form && (
        <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
          <div
            className="bg-white rounded-xl shadow-2xl p-6 w-96 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-800 mb-4">
              Nuevo marcador
              <span className="text-xs text-gray-400 ml-2">
                ({form.x.toFixed(1)}%, {form.y.toFixed(1)}%)
              </span>
            </h3>

            {/* Título */}
            <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Nombre del marcador"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            {/* Pin type */}
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
            <div className="grid grid-cols-5 gap-1 mb-3">
              {(Object.entries(PIN_CONFIG) as [PinType, typeof PIN_CONFIG.npc][]).map(([type, cfg]) => (
                <button
                  key={type}
                  onClick={() => setForm({ ...form, pinType: type })}
                  title={cfg.label}
                  className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border-2 text-xs transition-all
                    ${form.pinType === type
                      ? `${cfg.border} ${cfg.bg} text-white`
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
                >
                  <span className="text-base">{cfg.emoji}</span>
                  <span className="text-[10px] leading-none">{cfg.label}</span>
                </button>
              ))}
            </div>

            {/* Article search */}
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Artículo enlazado <span className="text-gray-400">(opcional)</span>
            </label>
            <div className="relative mb-4">
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Buscar artículo…"
                value={form.articleId
                  ? (suggestions.find(s => s.id === form.articleId)?.title ?? form.articleQuery)
                  : form.articleQuery}
                onChange={(e) => {
                  setForm({ ...form, articleQuery: e.target.value, articleId: null })
                  searchArticles(e.target.value)
                }}
              />
              {loadingSug && (
                <span className="absolute right-3 top-2.5 text-xs text-gray-400">…</span>
              )}
              {suggestions.length > 0 && !form.articleId && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg
                               shadow-lg mt-1 max-h-40 overflow-y-auto text-sm">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 truncate"
                        onClick={() => {
                          setForm({ ...form, articleId: s.id, articleQuery: s.title, title: form.title || s.title })
                          setSuggestions([])
                        }}
                      >
                        {s.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setForm(null); setSuggestions([]) }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Guardando…' : 'Guardar marcador'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper: grab supabase session token from client
async function getToken(): Promise<string> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}
