'use client'

import { useCallback } from 'react'
import type { HeaderField, HeaderFieldType } from '@/lib/types'
import { PrivacyToggle, PRIVATE_BLOCK_CLASS } from './PrivacyToggle'

interface Props {
  value: HeaderField[]
  onChange: (next: HeaderField[]) => void
}

function rid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return arr
  const next = arr.slice()
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

export function HeaderFieldsEditor({ value, onChange }: Props) {
  const add = useCallback(() => {
    onChange([...value, { id: rid(), label: '', value: '', type: 'text' }])
  }, [value, onChange])

  const remove = useCallback((id: string) => {
    onChange(value.filter(f => f.id !== id))
  }, [value, onChange])

  const move = useCallback((index: number, delta: -1 | 1) => {
    onChange(swap(value, index, index + delta))
  }, [value, onChange])

  const update = useCallback((id: string, patch: Partial<HeaderField>) => {
    onChange(value.map(f => (f.id === id ? { ...f, ...patch } : f)))
  }, [value, onChange])

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Ficha técnica
        </h3>
        <button
          type="button"
          onClick={add}
          className="text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          + Añadir campo
        </button>
      </header>

      {value.length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          Sin campos. Añadí “Capital”, “Población”, “Líder”, etc.
        </p>
      ) : (
        <ul className="space-y-2">
          {value.map((field, idx) => {
            const isPrivate = field.is_private === true
            return (
              <li
                key={field.id}
                className={
                  'grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-center rounded-md px-1 py-1 ' +
                  (isPrivate ? PRIVATE_BLOCK_CLASS : '')
                }
              >
                <input
                  type="text"
                  value={field.label}
                  onChange={e => update(field.id, { label: e.target.value })}
                  placeholder="Etiqueta"
                  aria-label="Etiqueta del campo"
                  className="text-xs font-medium px-2 py-1 rounded border border-gray-200 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={field.value}
                  onChange={e => update(field.id, { value: e.target.value })}
                  placeholder="Valor"
                  aria-label="Valor del campo"
                  className="text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <select
                  value={field.type}
                  onChange={e => update(field.id, { type: e.target.value as HeaderFieldType })}
                  aria-label="Tipo del campo"
                  className="text-xs px-1 py-1 rounded border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                </select>
                <PrivacyToggle
                  isPrivate={isPrivate}
                  onToggle={next => update(field.id, { is_private: next || undefined })}
                  label={field.label || 'campo'}
                  compact
                />
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Subir"
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs px-1"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === value.length - 1}
                    aria-label="Bajar"
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs px-1"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(field.id)}
                    aria-label="Eliminar campo"
                    className="text-gray-400 hover:text-red-500 text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
