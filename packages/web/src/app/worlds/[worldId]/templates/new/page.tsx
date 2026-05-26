import Link from 'next/link'
import { TemplateEditorForm } from '@/frontend/components/TemplateEditorForm'

interface Props {
  params: { worldId: string }
}

export default function NewTemplatePage({ params }: Props) {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link
          href={`/worlds/${params.worldId}/templates`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Volver a plantillas
        </Link>
      </div>
      <TemplateEditorForm worldId={params.worldId} />
    </main>
  )
}
