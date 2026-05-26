import { createClient } from '@/backend/db/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArticleEditorForm } from '@/frontend/components/ArticleEditorForm'
import type { TipTapContent } from '@/backend/types'

interface Props {
  params: { worldId: string; articleId: string }
}

export default async function ArticlePage({ params }: Props) {
  const supabase = await createClient()

  const { data: article } = await supabase
    .from('articles')
    .select('id, title, content, world_id')
    .eq('id', params.articleId)
    .eq('world_id', params.worldId)
    .single()

  if (!article) notFound()

  // Artículos que este artículo referencia
  const { data: outgoing } = await supabase
    .from('article_relations')
    .select('target_article_id, articles!article_relations_target_article_id_fkey(id, title)')
    .eq('source_article_id', params.articleId)

  // Artículos que referencian a este artículo
  const { data: incoming } = await supabase
    .from('article_relations')
    .select('source_article_id, articles!article_relations_source_article_id_fkey(id, title)')
    .eq('target_article_id', params.articleId)

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link
          href={`/worlds/${params.worldId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Volver al mundo
        </Link>
      </div>

      <ArticleEditorForm
        worldId={params.worldId}
        articleId={params.articleId}
        initialTitle={article.title}
        initialContent={article.content as TipTapContent | undefined}
      />

      {/* Panel de relaciones */}
      {((outgoing && outgoing.length > 0) || (incoming && incoming.length > 0)) && (
        <aside className="mt-10 pt-8 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Relaciones del artículo
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {outgoing && outgoing.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 mb-2">Este artículo menciona</h3>
                <ul className="space-y-1">
                  {outgoing.map(rel => {
                    const target = Array.isArray(rel.articles) ? rel.articles[0] : rel.articles
                    if (!target) return null
                    return (
                      <li key={rel.target_article_id}>
                        <Link
                          href={`/worlds/${params.worldId}/articles/${target.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          @{target.title}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {incoming && incoming.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 mb-2">Mencionado por</h3>
                <ul className="space-y-1">
                  {incoming.map(rel => {
                    const source = Array.isArray(rel.articles) ? rel.articles[0] : rel.articles
                    if (!source) return null
                    return (
                      <li key={rel.source_article_id}>
                        <Link
                          href={`/worlds/${params.worldId}/articles/${source.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          @{source.title}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </aside>
      )}
    </main>
  )
}
