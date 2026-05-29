'use client'

/**
 * Wrapper dinámico para InteractiveMapInner.
 * Leaflet necesita acceso a `window`, por lo que se importa con ssr:false.
 */

import dynamic from 'next/dynamic'
import type { MapWithPins, MapPin, PinType } from '@/lib/types'

const Inner = dynamic(() => import('./InteractiveMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
      <span className="text-gray-400 text-sm animate-pulse">Cargando mapa…</span>
    </div>
  ),
})

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

export function InteractiveMap(props: Props) {
  return <Inner {...props} />
}
