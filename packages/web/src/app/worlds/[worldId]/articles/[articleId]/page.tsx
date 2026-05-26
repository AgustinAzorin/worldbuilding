import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArticleEditorForm } from '@/frontend/components/ArticleEditorForm'
import { api } from '@/lib/api'

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
        initialHeaderFields={article.header_fields ?? []}
        initialModules={article.modules ?? []}
        initialOutgoing={article.outgoing}
        initialIncoming={article.incoming}
      />
    </main>
  )
}
