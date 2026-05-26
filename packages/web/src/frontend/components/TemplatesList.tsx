'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ArticleTemplateSummary } from '@/lib/types'

interface Props {
  worldId: string
  templates: ArticleTemplateSummary[]
}

const API_URL = () => process.env.NEXT_PUBLIC_API_URL ?? ''

export function TemplatesList({ worldId, templates }: Props) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla? Los artículos ya creados no se ven afectados.')) return
    setDeletingId(id)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const token = session?.access_token ?? ''
      await fetch(`${API_URL()}/templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
        <p className="text-sm mb-2">Aún no hay plantillas en este mundo.</p>
        <Link
          href={`/worlds/${worldId}/templates/new`}
          className="text-sm text-blue-600 hover:underline"
        >
          Crear la primera
        </Link>
      </div>
    )
  }

  return (
    <ul className="grid gap-3">
      {templates.map(tpl => (
        <li
          key={tpl.id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <Link
            href={`/worlds/${worldId}/templates/${tpl.id}`}
            className="flex-1 min-w-0"
          >
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
              {tpl.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Creada el {new Date(tpl.created_at).toLocaleDateString('es-AR')}
            </p>
          </Link>
          <button
            type="button"
            onClick={() => handleDelete(tpl.id)}
            disabled={deletingId === tpl.id}
            className="ml-3 text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
          >
            {deletingId === tpl.id ? 'Eliminando…' : 'Eliminar'}
          </button>
        </li>
      ))}
    </ul>
  )
}
