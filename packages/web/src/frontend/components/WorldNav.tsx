'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  worldId: string
  worldTitle: string
}

type ModuleKey = 'biblioteca' | 'arbol' | 'timeline' | 'facciones'

interface ModuleDef {
  key: ModuleKey
  label: string
  icon: string
  href: string
  active: (pathname: string, base: string) => boolean
  activeClass: string
}

const MODULES: ModuleDef[] = [
  {
    key: 'biblioteca',
    label: 'Biblioteca',
    icon: '📚',
    href: '',
    active: (p, base) => p === base,
    activeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    key: 'arbol',
    label: 'Árbol',
    icon: '🌳',
    href: '/trees',
    active: (p, base) => p.startsWith(`${base}/trees`),
    activeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    key: 'timeline',
    label: 'Timeline',
    icon: '⏳',
    href: '/timeline',
    active: (p, base) => p.startsWith(`${base}/timeline`),
    activeClass: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    key: 'facciones',
    label: 'Facciones',
    icon: '🏛️',
    href: '/organizations',
    active: (p, base) => p.startsWith(`${base}/organizations`),
    activeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
]

export function WorldNav({ worldId, worldTitle }: Props) {
  const pathname = usePathname() ?? ''
  const base = `/worlds/${worldId}`

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
        <Link
          href="/worlds"
          className="text-xs text-gray-400 hover:text-blue-600 transition-colors shrink-0"
        >
          ← Mis mundos
        </Link>
        <span className="text-sm font-semibold text-gray-700 truncate max-w-[200px] shrink-0">
          {worldTitle}
        </span>

        <div className="h-6 w-px bg-gray-200 shrink-0" aria-hidden />

        <nav className="flex items-center gap-1">
          {MODULES.map(m => {
            const isActive = m.active(pathname, base)
            return (
              <Link
                key={m.key}
                href={`${base}${m.href}`}
                aria-current={isActive ? 'page' : undefined}
                className={
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ' +
                  (isActive
                    ? `${m.activeClass} font-medium`
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50')
                }
              >
                <span aria-hidden>{m.icon}</span>
                <span>{m.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4 text-xs text-gray-400 shrink-0">
          <Link
            href={`${base}/templates`}
            className="hover:text-blue-600 transition-colors"
          >
            Plantillas
          </Link>
          <Link
            href={`${base}/graph`}
            className="flex items-center gap-1 hover:text-purple-600 transition-colors"
          >
            <span aria-hidden>⬡</span>
            <span>Grafo</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
