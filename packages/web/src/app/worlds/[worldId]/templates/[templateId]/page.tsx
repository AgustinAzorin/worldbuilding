import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'
import { TemplateEditorForm } from '@/frontend/components/TemplateEditorForm'

interface Props {
  params: { worldId: string; templateId: string }
}

export default async function EditTemplatePage({ params }: Props) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  const template = await api.templates.get(token, params.templateId).catch(() => null)
  if (!template || template.world_id !== params.worldId) notFound()

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
      <TemplateEditorForm
        worldId={params.worldId}
        templateId={params.templateId}
        initialName={template.name}
        initialHeaderFields={template.default_header_fields ?? []}
        initialModules={template.default_modules ?? []}
      />
    </main>
  )
}
