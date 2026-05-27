import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { TreesList } from '@frontend/components/TreesList'

interface Props {
  params: { worldId: string }
}

export default async function TreesPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/sign-in')

  const token = session.access_token

  const [world, trees] = await Promise.all([
    api.worlds.get(token, params.worldId).catch(() => null),
    api.worlds.listTrees(token, params.worldId).catch(() => [] as never[]),
  ])

  if (!world) notFound()

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4 flex-wrap">
          <Link
            href={`/worlds/${params.worldId}`}
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            ← {world.title}
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Árboles genealógicos</h1>
          <Link
            href={`/worlds/${params.worldId}/graph`}
            className="text-xs text-gray-400 hover:text-purple-600 transition-colors"
          >
            ⬡ Ver grafo
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {trees.length} {trees.length === 1 ? 'árbol' : 'árboles'}
            </span>
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-8">
        <TreesList worldId={params.worldId} initialTrees={trees} />
      </section>
    </main>
  )
}
