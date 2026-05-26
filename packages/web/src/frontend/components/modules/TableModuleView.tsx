'use client'

import type { TableColumn, TableModule, TableRow } from '@/lib/types'

interface Props {
  module: TableModule
  onChange: (next: TableModule) => void
}

function rid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function TableModuleView({ module, onChange }: Props) {
  const { columns, rows } = module.data

  const setData = (next: { columns: TableColumn[]; rows: TableRow[] }) =>
    onChange({ ...module, data: next })

  const addColumn = () => {
    const col: TableColumn = { id: rid(), label: `Columna ${columns.length + 1}` }
    setData({
      columns: [...columns, col],
      rows: rows.map(r => ({ ...r, cells: { ...r.cells, [col.id]: '' } })),
    })
  }

  const removeColumn = (colId: string) => {
    setData({
      columns: columns.filter(c => c.id !== colId),
      rows: rows.map(r => {
        const { [colId]: _omit, ...rest } = r.cells
        void _omit
        return { ...r, cells: rest }
      }),
    })
  }

  const renameColumn = (colId: string, label: string) =>
    setData({
      columns: columns.map(c => (c.id === colId ? { ...c, label } : c)),
      rows,
    })

  const addRow = () => {
    const cells: Record<string, string> = {}
    columns.forEach(c => { cells[c.id] = '' })
    setData({ columns, rows: [...rows, { id: rid(), cells }] })
  }

  const removeRow = (rowId: string) =>
    setData({ columns, rows: rows.filter(r => r.id !== rowId) })

  const updateCell = (rowId: string, colId: string, value: string) =>
    setData({
      columns,
      rows: rows.map(r => (r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r)),
    })

  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-xs">
        <button type="button" onClick={addColumn} className="text-blue-600 hover:text-blue-800 font-medium">
          + Columna
        </button>
        <button
          type="button"
          onClick={addRow}
          disabled={columns.length === 0}
          className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Fila
        </button>
      </div>

      {columns.length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          Empezá añadiendo columnas.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.id} className="border border-gray-200 bg-gray-50 p-1 align-bottom">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={col.label}
                        onChange={e => renameColumn(col.id, e.target.value)}
                        className="flex-1 min-w-0 text-xs font-semibold px-1 py-0.5 bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeColumn(col.id)}
                        aria-label="Eliminar columna"
                        className="text-gray-400 hover:text-red-500 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </th>
                ))}
                <th className="w-6 border border-gray-200 bg-gray-50" />
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  {columns.map(col => (
                    <td key={col.id} className="border border-gray-200 p-0">
                      <input
                        type="text"
                        value={row.cells[col.id] ?? ''}
                        onChange={e => updateCell(row.id, col.id, e.target.value)}
                        className="w-full px-2 py-1 bg-transparent focus:outline-none focus:bg-blue-50"
                      />
                    </td>
                  ))}
                  <td className="border border-gray-200 text-center align-middle">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      aria-label="Eliminar fila"
                      className="text-gray-400 hover:text-red-500 text-xs px-1"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
