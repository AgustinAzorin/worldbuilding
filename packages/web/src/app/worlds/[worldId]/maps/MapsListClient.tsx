'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NewMapForm } from '@frontend/components/NewMapForm'
import type { MapSummary } from '@/lib/types'

interface Props {
  worldId: string
  initialMaps: MapSummary[]
}

export function MapsListClient({ worldId, initialMaps }: Props) {
  const [maps, setMaps] = useState<MapSummary[]>(initialMaps)

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Mapas</h1>
          <span className="text-xs text-gray-500">
            {maps.length} {maps.length === 1 ? 'mapa' : 'mapas'}
          </span>
        </div>
        <NewMapForm
          worldId={worldId}
          onCreated={(map) => setMaps((prev) => [map, ...prev])}
        />
      </div>

      {maps.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-sm">No hay mapas todavía. ¡Creá el primero!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {maps.map((map) => (
            <Link
              key={map.id}
              href={`/worlds/${worldId}/maps/${map.id}`}
              className="group block bg-white rounded-xl overflow-hidden border border-gray-200
                         hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="h-40 bg-gray-100 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={map.image_url}
                  alt={map.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-gray-800 truncate">{map.title}</h2>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(map.created_at).toLocaleDateString('es-AR')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
