import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ArticleSuggestion } from '@/lib/types'

/**
 * GET /api/articles/search?q=<query>&worldId=<uuid>
 *
 * Devuelve hasta 10 artículos cuyo título coincida con `q` (ILIKE)
 * dentro del `worldId` especificado. La RLS garantiza que solo se
 * devuelven artículos del usuario autenticado.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? ''
  const worldId = searchParams.get('worldId') ?? ''

  if (!worldId) {
    return NextResponse.json({ error: 'worldId is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('articles')
    .select('id, title')
    .eq('world_id', worldId)
    .ilike('title', `%${query}%`)
    .order('title')
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json((data ?? []) as ArticleSuggestion[])
}
