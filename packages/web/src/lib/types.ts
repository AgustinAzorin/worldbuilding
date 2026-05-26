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

export const EMPTY_TIPTAP_DOC: TipTapContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}

// ── Header fields (ficha técnica ordenada) ────────────────────────────────

export type HeaderFieldType = 'text' | 'number'

export interface HeaderField {
  id: string
  label: string
  value: string
  type: HeaderFieldType
}

// ── Módulos del artículo ──────────────────────────────────────────────────

export type ArticleModuleType =
  | 'rich-text'
  | 'chart'
  | 'relations-graph'
  | 'table'
  | 'image'

export interface RichTextModule {
  id: string
  type: 'rich-text'
  title: string
  data: { doc: TipTapContent }
}

export interface ImageModule {
  id: string
  type: 'image'
  title: string
  data: { url: string | null; path: string | null; alt: string }
}

export interface ChartRow {
  id: string
  attribute: string
  value: number
}

export interface ChartModule {
  id: string
  type: 'chart'
  title: string
  data: { kind: 'radar' | 'bar'; rows: ChartRow[] }
}

export interface RelationsGraphModule {
  id: string
  type: 'relations-graph'
  title: string
  data: Record<string, never>
}

export interface TableColumn { id: string; label: string }
export interface TableRow    { id: string; cells: Record<string, string> }

export interface TableModule {
  id: string
  type: 'table'
  title: string
  data: { columns: TableColumn[]; rows: TableRow[] }
}

export type ArticleModule =
  | RichTextModule
  | ImageModule
  | ChartModule
  | RelationsGraphModule
  | TableModule

/** Factory de módulo vacío por tipo — usado por el botón "Añadir módulo". */
export function makeEmptyModule(type: ArticleModuleType, id: string): ArticleModule {
  switch (type) {
    case 'rich-text':
      return { id, type, title: 'Texto', data: { doc: { ...EMPTY_TIPTAP_DOC } } }
    case 'image':
      return { id, type, title: 'Imagen', data: { url: null, path: null, alt: '' } }
    case 'chart':
      return { id, type, title: 'Estadísticas', data: { kind: 'radar', rows: [] } }
    case 'relations-graph':
      return { id, type, title: 'Relaciones', data: {} }
    case 'table':
      return { id, type, title: 'Tabla', data: { columns: [], rows: [] } }
  }
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
  header_fields: HeaderField[]
  modules: ArticleModule[]
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

/** Article shape returned by getFolderTree (lightweight — no body) */
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
