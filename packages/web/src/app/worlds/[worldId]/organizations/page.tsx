import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { api } from '@/lib/api'
import { NewOrganizationForm } from '@frontend/components/NewOrganizationForm'
import { OrganizationsHierarchy } from '@frontend/components/OrganizationsHierarchy'
import { WorldNav } from '@frontend/components/WorldNav'

interface Props {
  params: { worldId: string }
}

export default async function OrganizationsPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/auth/sign-in')
  const token = session.access_token

  const [world, organizations] = await Promise.all([
    api.worlds.get(token, params.worldId).catch(() => null),
    api.worlds.listOrganizations(token, params.worldId).catch(() => []),
  ])

  if (!world) notFound()

  const totalMembers = organizations.reduce((acc, o) => acc + o.members_count, 0)

  return (
    <main className="min-h-screen bg-gray-50">
      <WorldNav worldId={params.worldId} worldTitle={world.title} />

      <section className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Facciones</h1>
            <span className="text-xs text-gray-400">
              {organizations.length}{' '}
              {organizations.length === 1 ? 'facción' : 'facciones'}
              {organizations.length > 0 && ` · ${totalMembers} membresías`}
            </span>
          </div>
          <NewOrganizationForm worldId={params.worldId} />
        </div>

        {organizations.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">No hay facciones todavía</p>
            <p className="text-sm">
              Creá una con el botón <strong>“+ Nueva organización”</strong> de
              arriba. Después, cualquier artículo del mundo puede declarar que
              es <em>Miembro de</em> ella desde su editor.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-4">
              Arrastrá el orden con ↑ ↓ entre facciones hermanas y elegí una
              <em> facción madre</em> para anidarlas como sub-facciones.
            </p>
            <OrganizationsHierarchy
              worldId={params.worldId}
              organizations={organizations}
            />
          </>
        )}
      </section>
    </main>
  )
}
