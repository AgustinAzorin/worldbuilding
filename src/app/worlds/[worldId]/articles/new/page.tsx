import Link from 'next/link'
import { ArticleEditorForm } from '@/components/ArticleEditorForm'

interface Props {
  params: { worldId: string }
}

export default function NewArticlePage({ params }: Props) {
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

      <ArticleEditorForm worldId={params.worldId} />
    </main>
  )
}
