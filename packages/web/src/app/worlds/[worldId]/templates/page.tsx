import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'
import { TemplatesList } from '@/frontend/components/TemplatesList'

interface Props {
  params: { worldId: string }
}

export default async function TemplatesPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  const [world, templates] = await Promise.all([
    api.worlds.get(token, params.worldId).catch(() => null),
    api.templates.list(token, params.worldId).catch(() => []),
  ])

  if (!world) notFound()

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/worlds/${params.worldId}`} className="text-sm text-blue-600 hover:underline">
          ← Volver a {world.title}
        </Link>
        <Link
          href={`/worlds/${params.worldId}/templates/new`}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nueva plantilla
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Plantillas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Presets reutilizables (Personaje, País, Item…) con ficha técnica y
          módulos preconfigurados.
        </p>
      </header>

      <TemplatesList worldId={params.worldId} templates={templates} />
    </main>
  )
}
