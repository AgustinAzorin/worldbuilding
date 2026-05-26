import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'

interface Props {
  params: { worldId: string }
}

export default async function WorldPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  const [world, articles] = await Promise.all([
    api.worlds.get(token, params.worldId).catch(() => null),
    api.worlds.articles(token, params.worldId).catch(() => []),
  ])

  if (!world) notFound()

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href="/worlds" className="text-sm text-blue-600 hover:underline">
            ← Todos los mundos
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">{world.title}</h1>
        </div>
        <Link
          href={`/worlds/${params.worldId}/articles/new`}
          className="mt-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nuevo artículo
        </Link>
      </div>

      {articles.length > 0 ? (
        <div className="grid gap-3">
          {articles.map(article => (
            <Link
              key={article.id}
              href={`/worlds/${params.worldId}/articles/${article.id}`}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {article.title}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Actualizado el {new Date(article.updated_at).toLocaleDateString('es-AR')}
                </p>
              </div>
              <span className="text-gray-300 group-hover:text-blue-400 text-xl">→</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">Este mundo no tiene artículos todavía</p>
          <Link href={`/worlds/${params.worldId}/articles/new`} className="text-sm text-blue-600 hover:underline">
            Creá el primer artículo
          </Link>
        </div>
      )}
    </main>
  )
}
