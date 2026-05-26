'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ArticleMetadata } from '@/lib/types'

interface MetadataPanelProps {
  value: ArticleMetadata
  onChange: (next: ArticleMetadata) => void
  className?: string
}

interface DraftRow {
  /** clave UI estable para no perder foco al renombrar */
  uiKey: string
  key: string
  value: string
}

let __rowCounter = 0
const nextUiKey = () => `row-${++__rowCounter}`

function toRows(meta: ArticleMetadata): DraftRow[] {
  return Object.entries(meta).map(([key, value]) => ({ uiKey: nextUiKey(), key, value }))
}

/**
 * Reduce filas a `ArticleMetadata`. Ignora claves vacías. Si dos filas
 * comparten clave, la última gana (estable con `Object.fromEntries`).
 */
function toMetadata(rows: DraftRow[]): ArticleMetadata {
  const cleaned = rows
    .map(r => [r.key.trim(), r.value] as const)
    .filter(([k]) => k.length > 0)
  return Object.fromEntries(cleaned)
}

export function MetadataPanel({ value, onChange, className = '' }: MetadataPanelProps) {
  // Las filas son estado local (necesitamos permitir claves vacías mientras
  // el usuario escribe), pero el objeto que sale al padre es siempre derivado.
  const [rows, setRows] = useState<DraftRow[]>(() => toRows(value))

  const duplicateKeys = useMemo(() => {
    const seen = new Map<string, number>()
    rows.forEach(r => {
      const k = r.key.trim()
      if (!k) return
      seen.set(k, (seen.get(k) ?? 0) + 1)
    })
    return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k))
  }, [rows])

  const commit = useCallback((next: DraftRow[]) => {
    setRows(next)
    onChange(toMetadata(next))
  }, [onChange])

  const handleAdd = useCallback(() => {
    commit([...rows, { uiKey: nextUiKey(), key: '', value: '' }])
  }, [rows, commit])

  const handleRemove = useCallback((uiKey: string) => {
    commit(rows.filter(r => r.uiKey !== uiKey))
  }, [rows, commit])

  const handleField = useCallback(
    (uiKey: string, field: 'key' | 'value', v: string) => {
      commit(rows.map(r => (r.uiKey === uiKey ? { ...r, [field]: v } : r)))
    },
    [rows, commit],
  )

  return (
    <aside className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Atributos
        </h3>
        <button
          type="button"
          onClick={handleAdd}
          className="text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          + Añadir
        </button>
      </header>

      {rows.length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          Sin atributos. Añadí campos como “Capital”, “Población” o “Líder”.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map(row => {
            const isDup = row.key.trim().length > 0 && duplicateKeys.has(row.key.trim())
            return (
              <li key={row.uiKey} className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={row.key}
                    onChange={e => handleField(row.uiKey, 'key', e.target.value)}
                    placeholder="Clave"
                    aria-label="Clave del atributo"
                    className={`w-full text-xs font-medium px-2 py-1 rounded border ${
                      isDup ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                    } focus:outline-none focus:ring-1 focus:ring-blue-400`}
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={e => handleField(row.uiKey, 'value', e.target.value)}
                    placeholder="Valor"
                    aria-label="Valor del atributo"
                    className="mt-1 w-full text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  {isDup && (
                    <p className="mt-1 text-[10px] text-red-500">
                      Clave duplicada: solo se guardará la última fila.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(row.uiKey)}
                  aria-label="Eliminar atributo"
                  className="mt-1 text-gray-400 hover:text-red-500 text-sm"
                  title="Eliminar"
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
