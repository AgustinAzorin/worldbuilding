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

// ── Folders ────────────────────────────────────────────────────────────────

export interface Folder {
  id: string
  name: string
  world_id: string
  parent_id: string | null
  created_at: string
}

/** Article shape returned by getFolderTree (lightweight — no content) */
export interface ArticleListItem {
  id: string
  title: string
  folder_id: string | null
  updated_at: string
}

/** Recursive node used by the FolderTree component */
export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[]
  articles: ArticleListItem[]
}

/** Flat payload from GET /worlds/:id/folder-tree */
export interface FolderTreePayload {
  folders: Folder[]
  articles: ArticleListItem[]
}

// ── Graph ──────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string
  title: string
  folder_id: string | null
}

export interface GraphLink {
  source: string
  target: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}
