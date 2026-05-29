import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { InteractiveMap } from '@frontend/components/map/InteractiveMap'

interface Props {
  params: { worldId: string; mapId: string }
}

export default async function MapDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/sign-in')

  const token = session.access_token

  const map = await api.maps.get(token, params.mapId).catch(() => null)
  if (!map || map.world_id !== params.worldId) notFound()

  return (
    <div className="flex h-screen flex-col bg-gray-950">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-4 border-b border-gray-800 bg-gray-900 px-4 py-3">
        <Link
          href={`/worlds/${params.worldId}/maps`}
          className="text-sm text-gray-400 transition-colors hover:text-white"
        >
          ← Mapas
        </Link>
        <h1 className="truncate text-sm font-semibold text-white">{map.title}</h1>
      </header>

      {/* Visor */}
      <div className="min-h-0 flex-1">
        <InteractiveMap
          worldId={params.worldId}
          mapId={map.id}
          imageUrl={map.image_url}
          initialPins={map.pins}
        />
      </div>
    </div>
  )
}
