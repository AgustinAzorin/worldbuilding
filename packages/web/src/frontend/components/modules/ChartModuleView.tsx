'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { ChartModule, ChartRow } from '@/lib/types'

// Recharts toca el DOM al medir tamaños → cargamos sin SSR.
const ChartCanvas = dynamic(() => import('./ChartCanvas').then(m => m.ChartCanvas), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center text-xs text-gray-400">Cargando gráfico…</div>,
})

interface Props {
  module: ChartModule
  onChange: (next: ChartModule) => void
}

function rid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function ChartModuleView({ module, onChange }: Props) {
  const { kind, rows } = module.data

  const setRows = (next: ChartRow[]) =>
    onChange({ ...module, data: { ...module.data, rows: next } })

  const setKind = (k: 'radar' | 'bar') =>
    onChange({ ...module, data: { ...module.data, kind: k } })

  const addRow = () => setRows([...rows, { id: rid(), attribute: '', value: 0 }])
  const removeRow = (id: string) => setRows(rows.filter(r => r.id !== id))
  const updateRow = (id: string, patch: Partial<ChartRow>) =>
    setRows(rows.map(r => (r.id === id ? { ...r, ...patch } : r)))

  const renderableRows = useMemo(
    () => rows.filter(r => r.attribute.trim().length > 0),
    [rows],
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-600">Tipo:</label>
        <select
          value={kind}
          onChange={e => setKind(e.target.value as 'radar' | 'bar')}
          className="text-xs px-2 py-1 rounded border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="radar">Radar</option>
          <option value="bar">Barras</option>
        </select>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Sin filas. Añadí Atributo / Valor.</p>
        ) : (
          rows.map(row => (
            <div key={row.id} className="flex items-center gap-2">
              <input
                type="text"
                value={row.attribute}
                onChange={e => updateRow(row.id, { attribute: e.target.value })}
                placeholder="Atributo (ej: Fuerza)"
                className="flex-1 text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <input
                type="number"
                value={Number.isFinite(row.value) ? row.value : 0}
                onChange={e => updateRow(row.id, { value: Number(e.target.value) || 0 })}
                placeholder="Valor"
                className="w-24 text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="text-gray-400 hover:text-red-500 text-sm"
                aria-label="Eliminar fila"
              >
                ✕
              </button>
            </div>
          ))
        )}
        <button
          type="button"
          onClick={addRow}
          className="text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          + Añadir fila
        </button>
      </div>

      {renderableRows.length > 0 ? (
        <ChartCanvas kind={kind} rows={renderableRows} />
      ) : (
        <p className="text-xs text-gray-400 italic">
          Añadí al menos una fila con nombre para ver el gráfico.
        </p>
      )}
    </div>
  )
}
