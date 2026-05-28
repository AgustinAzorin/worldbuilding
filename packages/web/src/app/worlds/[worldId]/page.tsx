import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { FolderTree } from '@frontend/components/FolderTree'

interface Props {
  params: { worldId: string }
}

export default async function WorldPage({ params }: Props) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  const [world, folderTree] = await Promise.all([
    api.worlds.get(token, params.worldId).catch(() => null),
    api.worlds.folderTree(token, params.worldId).catch(() => ({ folders: [], articles: [] })),
  ])

  if (!world) notFound()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 flex flex-col bg-white border-r border-gray-200 overflow-hidden">
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100">
          <Link
            href="/worlds"
            className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
          >
            ← Mis mundos
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={`/worlds/${params.worldId}/templates`}
              className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
              title="Plantillas"
            >
              Plantillas
            </Link>
            <Link
              href={`/worlds/${params.worldId}/timeline`}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors"
              title="Línea de tiempo"
            >
              <span>⏳</span>
              <span>Timeline</span>
            </Link>
            <Link
              href={`/worlds/${params.worldId}/trees`}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-600 transition-colors"
              title="Árboles genealógicos"
            >
              <span>🌳</span>
              <span>Árboles</span>
            </Link>
            <Link
              href={`/worlds/${params.worldId}/organizations`}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
              title="Organizaciones"
            >
              <span>🏛️</span>
              <span>Organizaciones</span>
            </Link>
            <Link
              href={`/worlds/${params.worldId}/graph`}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-600 transition-colors"
              title="Vista de grafo"
            >
              <span>⬡</span>
              <span>Grafo</span>
            </Link>
          </div>
        </div>

        <div className="px-2 py-2 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
            {world.title}
          </h2>
        </div>

        {/* Scrollable tree */}
        <div className="flex-1 overflow-y-auto">
          <FolderTree
            worldId={params.worldId}
            folders={folderTree.folders}
            articles={folderTree.articles}
          />
        </div>

        {/* New article CTA */}
        <div className="p-3 border-t border-gray-100">
          <Link
            href={`/worlds/${params.worldId}/articles/new`}
            className="flex items-center justify-center gap-1.5 w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>+</span> Nuevo artículo
          </Link>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-start justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{world.title}</h1>
            <Link
              href={`/worlds/${params.worldId}/graph`}
              className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 transition-colors border border-purple-200"
            >
              <span>⬡</span> Ver grafo de relaciones
            </Link>
          </div>

          {folderTree.articles.length > 0 ? (
            <div className="grid gap-3">
              {folderTree.articles.map(article => (
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
                      Actualizado el{' '}
                      {new Date(article.updated_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <span className="text-gray-300 group-hover:text-blue-400 text-xl">→</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg mb-1">Este mundo no tiene artículos todavía</p>
              <Link
                href={`/worlds/${params.worldId}/articles/new`}
                className="text-sm text-blue-600 hover:underline"
              >
                Creá el primer artículo
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
