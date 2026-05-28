import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { TreeEditor } from '@frontend/components/TreeEditor'

interface Props {
  params: { worldId: string; treeId: string }
}

export default async function TreeEditorPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/sign-in')

  const token = session.access_token

  const [world, tree] = await Promise.all([
    api.worlds.get(token, params.worldId).catch(() => null),
    api.trees.get(token, params.treeId).catch(() => null),
  ])

  if (!world || !tree || tree.world_id !== params.worldId) notFound()

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4 flex-wrap">
          <Link
            href={`/worlds/${params.worldId}/trees`}
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            ← Árbol
          </Link>
          <span className="text-xs text-gray-400">en {world.title}</span>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-8">
        <TreeEditor worldId={params.worldId} initialTree={tree} />
      </section>
    </main>
  )
}
