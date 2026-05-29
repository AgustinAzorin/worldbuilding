import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { api } from '@/lib/api'
import { WorldNav } from '@frontend/components/WorldNav'
import { MapViewerClient } from './MapViewerClient'

interface Props {
  params: { worldId: string; mapId: string }
}

export default async function MapDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/sign-in')

  const token = session.access_token

  const [world, mapData] = await Promise.all([
    api.worlds.get(token, params.worldId).catch(() => null),
    api.maps.getWithPins(token, params.mapId).catch(() => null),
  ])

  if (!world || !mapData) notFound()

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col">
      <WorldNav worldId={params.worldId} worldTitle={world.title} />

      <div className="flex-1 flex flex-col">
        <MapViewerClient
          mapData={mapData}
          worldId={params.worldId}
          accessToken={token}
        />
      </div>
    </main>
  )
}
