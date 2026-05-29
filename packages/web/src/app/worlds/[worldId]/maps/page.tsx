import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { api } from '@/lib/api'
import { WorldNav } from '@frontend/components/WorldNav'
import { MapsListClient } from './MapsListClient'

interface Props {
  params: { worldId: string }
}

export default async function MapsPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/sign-in')

  const token = session.access_token

  const [world, maps] = await Promise.all([
    api.worlds.get(token, params.worldId).catch(() => null),
    api.maps.list(token, params.worldId).catch(() => []),
  ])

  if (!world) notFound()

  return (
    <main className="min-h-screen bg-gray-50">
      <WorldNav worldId={params.worldId} worldTitle={world.title} />

      <section className="max-w-5xl mx-auto px-6 py-8">
        <MapsListClient
          worldId={params.worldId}
          initialMaps={maps}
        />
      </section>
    </main>
  )
}
