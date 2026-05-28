'use client'

import { useCallback } from 'react'

interface Props {
  isPrivate: boolean
  onToggle: (next: boolean) => void
  /** Texto para screen readers; el botón sólo muestra un icono. */
  label?: string
  /** Reduce el padding cuando el toggle vive en una fila densa (header). */
  compact?: boolean
}

/**
 * Botón "ojo / candado" que conmuta el flag `is_private` de un bloque.
 *
 *   - is_private = false  → ojo abierto, gris  (visible para todos)
 *   - is_private = true   → candado, ámbar     (sólo el dueño lo ve)
 */
export function PrivacyToggle({ isPrivate, onToggle, label, compact = false }: Props) {
  const handle = useCallback(() => onToggle(!isPrivate), [isPrivate, onToggle])

  const aria = label
    ? `${isPrivate ? 'Hacer público' : 'Marcar como privado'}: ${label}`
    : isPrivate ? 'Hacer público' : 'Marcar como privado'

  return (
    <button
      type="button"
      onClick={handle}
      aria-pressed={isPrivate}
      aria-label={aria}
      title={isPrivate ? 'Bloque secreto — sólo vos lo ves' : 'Bloque público'}
      className={
        (compact ? 'px-1 ' : 'px-1.5 py-1 ') +
        'text-base leading-none rounded transition-colors ' +
        (isPrivate
          ? 'text-amber-600 hover:text-amber-700'
          : 'text-gray-400 hover:text-gray-700')
      }
    >
      {isPrivate ? (
        // Candado cerrado
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 1a4 4 0 0 0-4 4v3H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4Zm2 7V5a2 2 0 1 0-4 0v3h4Z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        // Ojo abierto
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path d="M10 4C5.5 4 1.7 7 .5 10c1.2 3 5 6 9.5 6s8.3-3 9.5-6c-1.2-3-5-6-9.5-6Zm0 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        </svg>
      )}
    </button>
  )
}

/**
 * Clases Tailwind a aplicar al contenedor del bloque cuando es privado:
 * borde ámbar + fondo texturizado con striping diagonal sutil para que
 * el creador identifique al vuelo qué piezas son secretas.
 */
export const PRIVATE_BLOCK_CLASS =
  'ring-1 ring-amber-400/70 bg-[repeating-linear-gradient(45deg,rgba(251,191,36,0.08)_0_6px,transparent_6px_12px)]'
