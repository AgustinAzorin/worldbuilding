import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { WorldNav } from '@frontend/components/WorldNav'
import { UploadMapForm } from '@frontend/components/map/UploadMapForm'

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
    api.maps.list(token, params.worldId).catch(() => [] as never[]),
  ])

  if (!world) notFound()

  return (
    <main className="min-h-screen bg-gray-50">
      <WorldNav worldId={params.worldId} worldTitle={world.title} />

      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Cartografía</h1>
            <span className="text-xs text-gray-500">
              {maps.length} {maps.length === 1 ? 'mapa' : 'mapas'}
            </span>
          </div>
          <UploadMapForm worldId={params.worldId} />
        </div>

        {maps.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {maps.map(map => (
              <Link
                key={map.id}
                href={`/worlds/${params.worldId}/maps/${map.id}`}
                className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="aspect-video overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={map.image_url}
                    alt={map.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <h3 className="truncate font-semibold text-gray-900 group-hover:text-blue-600">
                    {map.title}
                  </h3>
                  <span className="shrink-0 text-xs text-gray-400">
                    {map.pin_count} 📍
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-gray-400">
            <p className="mb-1 text-lg">Este mundo no tiene mapas todavía</p>
            <p className="text-sm">Subí una imagen para empezar a colocar marcadores.</p>
          </div>
        )}
      </section>
    </main>
  )
}
