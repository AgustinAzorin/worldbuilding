import { createClient } from '@/backend/db/server'
import Link from 'next/link'
import { createWorld } from '@/backend/actions/worlds'

export default async function WorldsPage() {
  const supabase = await createClient()
  const { data: worlds } = await supabase
    .from('worlds')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mis Mundos</h1>
      </div>

      {/* Formulario de creación */}
      <form
        action={createWorld}
        className="mb-8 p-5 bg-white rounded-xl border border-gray-200 shadow-sm"
      >
        <h2 className="text-base font-semibold text-gray-700 mb-3">Crear nuevo mundo</h2>
        <div className="flex gap-3">
          <input
            name="title"
            type="text"
            placeholder="Nombre del mundo…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Crear
          </button>
        </div>
      </form>

      {/* Lista de mundos */}
      {worlds && worlds.length > 0 ? (
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
