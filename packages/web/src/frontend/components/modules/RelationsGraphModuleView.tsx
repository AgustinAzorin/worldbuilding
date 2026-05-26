'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { ArticleRef, RelationsGraphModule } from '@/lib/types'

const RelationsMiniGraph = dynamic(
  () => import('./RelationsMiniGraph').then(m => m.RelationsMiniGraph),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center text-xs text-gray-400">
        Cargando grafo…
      </div>
    ),
  },
)

interface Props {
  module: RelationsGraphModule
  worldId: string
  articleId: string | null
  articleTitle: string
  outgoing: ArticleRef[]
  incoming: ArticleRef[]
}

export function RelationsGraphModuleView({
  worldId,
  articleId,
  articleTitle,
  outgoing,
  incoming,
}: Props) {
  const total = outgoing.length + incoming.length

  // Asegurar nodos únicos: un artículo podría aparecer en ambos lados.
  const neighbors = useMemo(() => {
    const map = new Map<string, ArticleRef>()
    outgoing.forEach(r => map.set(r.id, r))
    incoming.forEach(r => map.set(r.id, r))
    return [...map.values()]
  }, [outgoing, incoming])

  if (!articleId) {
    return (
      <p className="text-xs text-gray-400 italic">
        Guardá el artículo para ver sus relaciones.
      </p>
    )
  }

  if (total === 0) {
    return (
      <p className="text-xs text-gray-400 italic">
        Sin relaciones aún. Mencioná otros artículos con @ desde un módulo de texto.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <RelationsMiniGraph
        worldId={worldId}
        centerId={articleId}
        centerTitle={articleTitle || 'Este artículo'}
        outgoing={outgoing}
        incoming={incoming}
      />
      <ul className="text-xs text-gray-600 grid sm:grid-cols-2 gap-x-4 gap-y-1">
        {neighbors.map(n => (
          <li key={n.id}>
            <Link
              href={`/worlds/${worldId}/articles/${n.id}`}
              className="text-blue-600 hover:underline"
            >
              @{n.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
