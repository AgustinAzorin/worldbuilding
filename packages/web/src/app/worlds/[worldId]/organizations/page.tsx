import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { NewOrganizationForm } from '@frontend/components/NewOrganizationForm'
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.map(org => (
              <Link
                key={org.id}
                href={`/worlds/${params.worldId}/articles/${org.id}`}
                className="group flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-lg font-bold shadow-sm"
                  >
                    {org.title.trim().charAt(0).toUpperCase() || '?'}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors truncate">
                      {org.title}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Actualizada el{' '}
                      {new Date(org.updated_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span
                    className={
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ' +
                      (org.members_count > 0
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        : 'bg-gray-100 text-gray-500 border border-gray-200')
                    }
                  >
                    <span aria-hidden>👥</span>
                    {org.members_count}{' '}
                    {org.members_count === 1 ? 'miembro' : 'miembros'}
                  </span>
                  <span className="text-gray-300 group-hover:text-indigo-400 text-xl">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
