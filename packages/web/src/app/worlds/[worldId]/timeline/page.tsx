import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { api } from '@/lib/api'
import { Timeline } from '@frontend/components/Timeline'
import { NewEventForm } from '@frontend/components/NewEventForm'
import { WorldNav } from '@frontend/components/WorldNav'

interface Props {
  params: { worldId: string }
}

export default async function TimelinePage({ params }: Props) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/auth/sign-in')

  const token = session.access_token

  const [world, events] = await Promise.all([
    api.worlds.get(token, params.worldId).catch(() => null),
    api.worlds.timelineEvents(token, params.worldId).catch(() => [] as never[]),
  ])

  if (!world) notFound()

  const datedCount = events.filter(e => e.start_year !== null).length

  return (
    <main className="min-h-screen bg-gray-50">
      <WorldNav worldId={params.worldId} worldTitle={world.title} />

      <section className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>
            <span className="text-xs text-gray-500">
              {events.length} {events.length === 1 ? 'evento' : 'eventos'}
              {datedCount !== events.length && ` (${datedCount} con fecha)`}
            </span>
          </div>
          <NewEventForm worldId={params.worldId} />
        </div>
        <Timeline worldId={params.worldId} events={events} />
      </section>
    </main>
  )
}
