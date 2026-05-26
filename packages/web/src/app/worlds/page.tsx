import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CreateWorldForm } from '@/frontend/components/CreateWorldForm'
import { api } from '@/lib/api'
import type { World } from '@/lib/types'

export default async function WorldsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  let worlds: World[] = []
  try {
    worlds = await api.worlds.list(token)
  } catch { /* sin mundos todavía */ }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Mis Mundos</h1>

      <CreateWorldForm />

      {worlds.length > 0 ? (
        <div className="grid gap-3">
          {worlds.map(world => (
            <Link
              key={world.id}
              href={`/worlds/${world.id}`}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {world.title}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Creado el {new Date(world.created_at).toLocaleDateString('es-AR')}
                </p>
              </div>
              <span className="text-gray-300 group-hover:text-blue-400 text-xl">→</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">No hay mundos todavía</p>
          <p className="text-sm">Creá tu primer mundo arriba para empezar.</p>
        </div>
      )}
    </main>
  )
}
