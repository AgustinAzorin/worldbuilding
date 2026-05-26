import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Timeline } from '@frontend/components/Timeline'
import { NewEventForm } from '@frontend/components/NewEventForm'

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
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4 flex-wrap">
          <Link
            href={`/worlds/${params.worldId}`}
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            ← {world.title}
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Línea de Tiempo</h1>
          <Link
            href={`/worlds/${params.worldId}/graph`}
            className="text-xs text-gray-400 hover:text-purple-600 transition-colors"
          >
            ⬡ Ver grafo
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {events.length} {events.length === 1 ? 'evento' : 'eventos'}
              {datedCount !== events.length && ` (${datedCount} con fecha)`}
            </span>
            <NewEventForm worldId={params.worldId} />
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-10">
        <Timeline worldId={params.worldId} events={events} />
      </section>
    </main>
  )
}
