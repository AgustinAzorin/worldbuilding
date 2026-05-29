'use client'

import { useEffect, useMemo, useState } from 'react'
import L, {
  type DivIcon,
  type LatLngBoundsExpression,
  type LatLngExpression,
  type LeafletMouseEvent,
  type Map as LeafletMap,
} from 'leaflet'
import {
  ImageOverlay,
  MapContainer,
  Marker,
  Tooltip,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { PIN_TYPE_META, type MapPin, type PinType } from '@/lib/types'

// ── Coordenadas relativas (0..1) ⇄ coordenadas Leaflet (CRS.Simple) ─────────
//
// En CRS.Simple, una LatLng se interpreta como [y, x] y la latitud crece
// hacia ARRIBA. Para que un click "arriba a la izquierda" de la imagen se
// guarde como (x≈0, y≈0) usamos coordenadas relativas con el origen en la
// esquina superior izquierda y las convertimos contra las dimensiones
// naturales de la imagen.

interface Dimensions {
  width: number
  height: number
}

function relToLatLng(x: number, y: number, dim: Dimensions): LatLngExpression {
  return [(1 - y) * dim.height, x * dim.width]
}

function latLngToRel(
  lat: number,
  lng: number,
  dim: Dimensions,
): { x: number; y: number } {
  const x = clamp01(lng / dim.width)
  const y = clamp01(1 - lat / dim.height)
  return { x, y }
}

function clamp01(v: number): number {
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

// ── Icono de pin diferenciado por tipo ──────────────────────────────────────

const iconCache = new Map<string, DivIcon>()

function pinIcon(type: PinType, draft = false): DivIcon {
  const key = `${type}:${draft ? 'draft' : 'solid'}`
  const cached = iconCache.get(key)
  if (cached) return cached

  const { color, emoji } = PIN_TYPE_META[type]
  const ring = draft
    ? 'animation:wb-pin-pulse 1s ease-in-out infinite;opacity:.85;'
    : ''
  const html = `
    <div style="
      width:28px;height:28px;border-radius:9999px;
      background:${color};border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.4);
      display:flex;align-items:center;justify-content:center;
      font-size:14px;line-height:1;${ring}
    ">${emoji}</div>`

  const icon = L.divIcon({
    html,
    className: 'wb-map-pin',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    tooltipAnchor: [0, -16],
  })
  iconCache.set(key, icon)
  return icon
}

// ── Captura de clicks sobre el mapa (sólo en modo edición) ──────────────────

function ClickCapture({
  dim,
  onMapClick,
}: {
  dim: Dimensions
  onMapClick: (rel: { x: number; y: number }) => void
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onMapClick(latLngToRel(e.latlng.lat, e.latlng.lng, dim))
    },
  })
  return null
}

// ── Componente principal ────────────────────────────────────────────────────

export interface MapInnerProps {
  imageUrl: string
  pins: MapPin[]
  editMode: boolean
  /** Pin temporal que se está colocando (coordenadas relativas). */
  draftPin: { x: number; y: number; pinType: PinType } | null
  onMapClick: (rel: { x: number; y: number }) => void
  onPinClick: (pin: MapPin) => void
}

export default function MapInner({
  imageUrl,
  pins,
  editMode,
  draftPin,
  onMapClick,
  onPinClick,
}: MapInnerProps) {
  const [dim, setDim] = useState<Dimensions | null>(null)
  const [map, setMap] = useState<LeafletMap | null>(null)

  // Cargamos la imagen para conocer sus dimensiones naturales y derivar
  // los bounds del lienzo en CRS.Simple.
  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (!cancelled) setDim({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = imageUrl
    return () => {
      cancelled = true
    }
  }, [imageUrl])

  const bounds = useMemo<LatLngBoundsExpression | null>(
    () => (dim ? [[0, 0], [dim.height, dim.width]] : null),
    [dim],
  )

  // El contenedor puede montarse antes de que Leaflet calcule su tamaño:
  // forzamos un invalidateSize cuando ya tenemos mapa + dimensiones.
  useEffect(() => {
    if (!map || !bounds) return
    map.invalidateSize()
    map.fitBounds(bounds)
  }, [map, bounds])

  if (!dim || !bounds) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
        Cargando mapa…
      </div>
    )
  }

  return (
    <MapContainer
      ref={setMap}
      crs={L.CRS.Simple}
      bounds={bounds}
      maxBounds={bounds}
      maxBoundsViscosity={1}
      minZoom={-4}
      maxZoom={4}
      zoomSnap={0.25}
      attributionControl={false}
      className={editMode ? 'h-full w-full cursor-crosshair' : 'h-full w-full'}
      style={{ background: '#0f172a' }}
    >
      <ImageOverlay url={imageUrl} bounds={bounds} />

      {editMode && <ClickCapture dim={dim} onMapClick={onMapClick} />}

      {pins.map(pin => (
        <Marker
          key={pin.id}
          position={relToLatLng(pin.x, pin.y, dim)}
          icon={pinIcon(pin.pin_type)}
          eventHandlers={{ click: () => onPinClick(pin) }}
        >
          <Tooltip direction="top" offset={[0, -4]}>
            <span className="font-medium">{pin.title}</span>
            {pin.article && (
              <span className="ml-1 text-gray-400">· {PIN_TYPE_META[pin.pin_type].label}</span>
            )}
          </Tooltip>
        </Marker>
      ))}

      {draftPin && (
        <Marker
          position={relToLatLng(draftPin.x, draftPin.y, dim)}
          icon={pinIcon(draftPin.pinType, true)}
          interactive={false}
        />
      )}
    </MapContainer>
  )
}
