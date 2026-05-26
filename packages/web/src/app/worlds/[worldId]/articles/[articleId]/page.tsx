import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArticleEditorForm } from '@/frontend/components/ArticleEditorForm'
import { api } from '@/lib/api'
import type { TipTapContent } from '@/lib/types'

interface Props {
  params: { worldId: string; articleId: string }
}

export default async function ArticlePage({ params }: Props) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  const article = await api.articles.get(token, params.articleId).catch(() => null)
  if (!article || article.world_id !== params.worldId) notFound()

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href={`/worlds/${params.worldId}`} className="text-sm text-blue-600 hover:underline">
          ← Volver al mundo
        </Link>
      </div>

      <ArticleEditorForm
        worldId={params.worldId}
        articleId={params.articleId}
        initialTitle={article.title}
        initialContent={article.content as TipTapContent | undefined}
      />

      {(article.outgoing.length > 0 || article.incoming.length > 0) && (
        <aside className="mt-10 pt-8 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Relaciones del artículo
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {article.outgoing.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 mb-2">Este artículo menciona</h3>
                <ul className="space-y-1">
                  {article.outgoing.map(ref => (
                    <li key={ref.id}>
                      <Link href={`/worlds/${params.worldId}/articles/${ref.id}`} className="text-sm text-blue-600 hover:underline">
                        @{ref.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {article.incoming.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 mb-2">Mencionado por</h3>
                <ul className="space-y-1">
                  {article.incoming.map(ref => (
                    <li key={ref.id}>
                      <Link href={`/worlds/${params.worldId}/articles/${ref.id}`} className="text-sm text-blue-600 hover:underline">
                        @{ref.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      )}
    </main>
  )
}
