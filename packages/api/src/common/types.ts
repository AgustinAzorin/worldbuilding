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
