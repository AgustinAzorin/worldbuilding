import Link from 'next/link'
import { NewArticleForm } from '@/frontend/components/NewArticleForm'

interface Props {
  params: { worldId: string }
}

export default function NewArticlePage({ params }: Props) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href={`/worlds/${params.worldId}`} className="text-sm text-blue-600 hover:underline">
          ← Volver al mundo
        </Link>
      </div>
      <NewArticleForm worldId={params.worldId} />
    </main>
  )
}
