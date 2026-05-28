import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { api } from '@/lib/api'
import { TreesList } from '@frontend/components/TreesList'
import { WorldNav } from '@frontend/components/WorldNav'

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
      <WorldNav worldId={params.worldId} worldTitle={world.title} />

      <section className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Árbol</h1>
          <span className="text-xs text-gray-500">
            {trees.length} {trees.length === 1 ? 'árbol' : 'árboles'}
          </span>
        </div>
        <TreesList worldId={params.worldId} initialTrees={trees} />
      </section>
    </main>
  )
}
