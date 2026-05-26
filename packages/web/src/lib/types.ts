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

// ── API response shapes ────────────────────────────────────────────────────

export interface World {
  id: string
  title: string
  user_id: string
  created_at: string
}

export interface Article {
  id: string
  world_id: string
  title: string
  content: TipTapContent | null
  created_at: string
  updated_at: string
}

export interface ArticleSuggestion {
  id: string
  title: string
}

export interface ArticleRef {
  id: string
  title: string
}

export interface ArticleWithRelations extends Article {
  outgoing: ArticleRef[]
  incoming: ArticleRef[]
}
