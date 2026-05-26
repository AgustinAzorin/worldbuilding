import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { GraphView } from '@frontend/components/GraphView'

interface Props {
  params: { worldId: string }
}

export default async function GraphPage({ params }: Props) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/auth/sign-in')

  const token = session.access_token

  const [world, graphData] = await Promise.all([
    api.worlds.get(token, params.worldId).catch(() => null),
    api.worlds.graph(token, params.worldId).catch(() => ({ nodes: [], links: [] })),
  ])

  if (!world) notFound()

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <Link
          href={`/worlds/${params.worldId}`}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← {world.title}
        </Link>
        <h1 className="text-sm font-semibold text-white">Vista de Grafo</h1>
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
          <span>{graphData.nodes.length} artículos</span>
          <span>{graphData.links.length} conexiones</span>
        </div>
      </header>

      {/* Full-screen canvas */}
      <div className="flex-1 min-h-0">
        <GraphView worldId={params.worldId} data={graphData} />
      </div>
    </div>
  )
}
