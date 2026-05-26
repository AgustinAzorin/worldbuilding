'use server'

import { createClient } from '@/backend/db/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createWorld(formData: FormData): Promise<void> {
  const title = (formData.get('title') as string | null)?.trim()
  if (!title) throw new Error('El título es requerido')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('worlds')
    .insert({ title, user_id: user.id })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/worlds')
  redirect(`/worlds/${data.id}`)
}
