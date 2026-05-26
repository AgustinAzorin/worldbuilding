'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TipTapContent, TipTapNode } from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────

/** Recorre el árbol JSON de TipTap y extrae los attrs.id de todos los nodos mention */
function extractMentionIds(node: TipTapNode): string[] {
  const ids: string[] = []

  if (node.type === 'mention' && typeof node.attrs?.id === 'string') {
    ids.push(node.attrs.id)
  }

  if (node.content) {
    for (const child of node.content) {
      ids.push(...extractMentionIds(child))
    }
  }

  return ids
}

function uniqueIds(ids: string[], excludeId?: string): string[] {
  return [...new Set(ids)].filter(id => id !== excludeId)
}

// ── Actions ────────────────────────────────────────────────────────────────

/**
 * Crea un nuevo artículo e inserta sus relaciones iniciales.
 * Retorna el id generado o un mensaje de error.
 */
export async function createArticle(
  worldId: string,
  title: string,
  content: TipTapContent
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error: insertError } = await supabase
    .from('articles')
    .insert({ world_id: worldId, title, content })
    .select('id')
    .single()

  if (insertError) return { id: null, error: insertError.message }

  const targetIds = uniqueIds(extractMentionIds(content))
  if (targetIds.length > 0) {
    await supabase.from('article_relations').insert(
      targetIds.map(targetId => ({
        source_article_id: data.id,
        target_article_id: targetId,
      }))
    )
  }

  revalidatePath(`/worlds/${worldId}`)
  return { id: data.id, error: null }
}

/**
 * Actualiza título + contenido de un artículo y sincroniza de forma
 * atómica sus relaciones via la función RPC sync_article_relations.
 */
export async function updateArticle(
  articleId: string,
  worldId: string,
  title: string,
  content: TipTapContent
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error: updateError } = await supabase
    .from('articles')
    .update({ title, content })
    .eq('id', articleId)

  if (updateError) return { error: updateError.message }

  const targetIds = uniqueIds(extractMentionIds(content), articleId)

  const { error: rpcError } = await supabase.rpc('sync_article_relations', {
    p_source_id: articleId,
    p_target_ids: targetIds,
  })

  if (rpcError) return { error: rpcError.message }

  revalidatePath(`/worlds/${worldId}/articles/${articleId}`)
  revalidatePath(`/worlds/${worldId}`)
  return { error: null }
}
