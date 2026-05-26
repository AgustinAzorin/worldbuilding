// ── TipTap JSON types ──────────────────────────────────────────────────────

export interface TipTapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TipTapNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

export interface TipTapContent {
  type: 'doc'
  content: TipTapNode[]
}

// ── Article metadata (custom labels) ───────────────────────────────────────

/**
 * Mapa clave/valor de labels personalizables por artículo.
 * Persistido como columna JSONB `articles.metadata`.
 */
export type ArticleMetadata = Record<string, string>

/** Valida que `value` sea un objeto plano con todas sus entradas string→string. */
export function isArticleMetadata(value: unknown): value is ArticleMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value as Record<string, unknown>).every(v => typeof v === 'string')
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Recorre el árbol JSON y extrae todos los attrs.id de nodos mention */
function collectMentionIds(node: TipTapNode, acc: string[]): void {
  if (node.type === 'mention' && typeof node.attrs?.id === 'string') {
    acc.push(node.attrs.id)
  }
  node.content?.forEach(child => collectMentionIds(child, acc))
}

export function uniqueMentionIds(content: TipTapContent, excludeId?: string): string[] {
  const ids: string[] = []
  collectMentionIds(content, ids)
  return [...new Set(ids)].filter(id => id !== excludeId)
}
