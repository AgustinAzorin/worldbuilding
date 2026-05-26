'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import type { TimelineEvent } from '@/lib/types'

interface TimelineProps {
  worldId: string
  events: TimelineEvent[]
}

/** Etiqueta de display: prioriza `date_display` y cae al rango numérico. */
function formatYearLabel(ev: TimelineEvent): string {
  if (ev.date_display && ev.date_display.trim().length > 0) {
    return ev.date_display
  }
  if (ev.start_year === null) return 'Sin fecha asignada'
  if (ev.end_year !== null && ev.end_year !== ev.start_year) {
    return `${ev.start_year} – ${ev.end_year}`
  }
  return String(ev.start_year)
}

function hasRange(ev: TimelineEvent): boolean {
  return ev.end_year !== null && ev.start_year !== null && ev.end_year > ev.start_year
}

export function Timeline({ worldId, events }: TimelineProps) {
  // Partición: dated (con start_year) primero, undated al final.
  const { dated, undated } = useMemo(() => {
    const dated: TimelineEvent[] = []
    const undated: TimelineEvent[] = []
    for (const ev of events) {
      if (ev.start_year === null || ev.start_year === undefined) undated.push(ev)
      else dated.push(ev)
    }
    return { dated, undated }
  }, [events])

  if (events.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg mb-2">No hay eventos históricos todavía</p>
        <p className="text-sm">
          Creá uno con el botón <strong>“+ Crear Evento Histórico”</strong> de arriba.
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Eje vertical */}
      <div
        aria-hidden
        className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-300 via-orange-400 to-red-500 rounded"
      />

      <ol className="space-y-6">
        {dated.map(ev => (
          <TimelineRow key={ev.id} worldId={worldId} event={ev} />
        ))}

        {undated.length > 0 && (
          <li className="pt-4">
            <h3 className="ml-12 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Eventos sin fecha asignada
            </h3>
            <ol className="space-y-6">
              {undated.map(ev => (
                <TimelineRow key={ev.id} worldId={worldId} event={ev} muted />
              ))}
            </ol>
          </li>
        )}
      </ol>
    </div>
  )
}

// ── Fila individual ───────────────────────────────────────────────────────

interface RowProps {
  worldId: string
  event: TimelineEvent
  muted?: boolean
}

function TimelineRow({ worldId, event, muted = false }: RowProps) {
  const range = hasRange(event)
  const label = formatYearLabel(event)

  return (
    <li className="relative pl-12">
      {/* Punto / marcador sobre el eje */}
      <span
        aria-hidden
        className={`
          absolute left-2.5 top-2.5 w-3 h-3 rounded-full ring-4
          ${muted
            ? 'bg-gray-300 ring-gray-100'
            : 'bg-red-500 ring-red-100'}
        `}
      />

      {/* Indicador de duración (cápsula sobre el eje) */}
      {range && (
        <span
          aria-hidden
          className="absolute left-3 top-5 w-1 h-16 bg-red-300/70 rounded"
          title={`Rango: ${event.start_year} – ${event.end_year}`}
        />
      )}

      <Link
        href={`/worlds/${worldId}/articles/${event.id}`}
        className="block group rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-red-300 hover:shadow-md transition-all"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className={`text-2xl font-bold leading-tight ${
                muted ? 'text-gray-400' : 'text-red-600'
              }`}
            >
              {label}
            </div>
            <h2 className="mt-1 text-lg font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
              {event.title}
            </h2>

            {range && (
              <p className="mt-1 text-xs text-gray-500">
                Duración: <strong>{(event.end_year ?? 0) - (event.start_year ?? 0)}</strong>{' '}
                {((event.end_year ?? 0) - (event.start_year ?? 0)) === 1 ? 'año' : 'años'}
                {' '}<span className="text-gray-400">({event.start_year} – {event.end_year})</span>
              </p>
            )}
          </div>

          <span className="text-gray-300 group-hover:text-red-400 text-xl">→</span>
        </div>
      </Link>
    </li>
  )
}
