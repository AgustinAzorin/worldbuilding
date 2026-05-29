'use client'

import { useState } from 'react'
import Link from 'next/link'
import { InteractiveMap } from '@frontend/components/InteractiveMap'
import type { MapWithPins, MapPin, PinType } from '@/lib/types'

interface Props {
  mapData: MapWithPins
  worldId: string
  accessToken: string
}

export function MapViewerClient({ mapData, worldId, accessToken }: Props) {
  const [editMode, setEditMode] = useState(false)

  const handleSavePin = async (pin: {
    mapId: string
    articleId: string | null
    title: string
    x: number
    y: number
    pinType: PinType
  }): Promise<MapPin> => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? ''}/maps/pins`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(pin),
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string }
      throw new Error(err.message ?? `Error ${res.status}`)
    }
    return res.json() as Promise<MapPin>
  }

  const handleDeletePin = async (pinId: string): Promise<void> => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? ''}/maps/pins/${pinId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({})) as { message?: string }
      throw new Error(err.message ?? `Error ${res.status}`)
    }
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center gap-4">
        <Link
          href={`/worlds/${worldId}/maps`}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          ← Mapas
        </Link>
        <h1 className="text-sm font-semibold text-gray-100 flex-1 truncate">
          {mapData.title}
        </h1>
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            editMode
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {editMode ? '✏️ Modo edición — Click para colocar pin' : '👁 Modo lectura'}
        </button>
      </div>

      {/* Map area */}
      <div className="flex-1 p-4" style={{ minHeight: 0 }}>
        <div className="w-full h-full" style={{ minHeight: '60vh' }}>
          <InteractiveMap
            mapData={mapData}
            worldId={worldId}
            editMode={editMode}
            onSavePin={handleSavePin}
            onDeletePin={handleDeletePin}
          />
        </div>
      </div>

      {editMode && (
        <p className="text-center text-xs text-gray-500 pb-2">
          Click izquierdo para agregar pin · Click derecho sobre un pin para eliminarlo
        </p>
      )}
    </div>
  )
}
