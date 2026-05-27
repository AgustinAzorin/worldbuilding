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
  | 'relations-manager'
  | 'family-tree'

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

export interface RelationsManagerModule {
  id: string
  type: 'relations-manager'
  title: string
  data: Record<string, never>
}

export interface FamilyTreeModule {
  id: string
  type: 'family-tree'
  title: string
  data: Record<string, never>
}

export type ArticleModule =
  | RichTextModule
  | ImageModule
  | ChartModule
  | RelationsGraphModule
  | TableModule
  | RelationsManagerModule
  | FamilyTreeModule

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
    case 'relations-manager':
      return { id, type, title: 'Relaciones explícitas', data: {} }
    case 'family-tree':
      return { id, type, title: 'Árbol genealógico', data: {} }
  }
}

// ── API response shapes ────────────────────────────────────────────────────

export interface World {
  id: string
  title: string
  user_id: string
  created_at: string
}

export type ArticleType = 'document' | 'event'

export interface Article {
  id: string
  world_id: string
  title: string
  header_fields: HeaderField[]
  modules: ArticleModule[]
  type?: ArticleType
  start_year?: number | null
  end_year?: number | null
  date_display?: string | null
  created_at: string
  updated_at: string
}

/** Payload de metadatos de evento que viaja en create/update de artículos. */
export interface EventMetadataPatch {
  type?: ArticleType
  startYear?: number | null
  endYear?: number | null
  dateDisplay?: string | null
}

/** Fila mínima usada por la vista de Línea de Tiempo. */
export interface TimelineEvent {
  id: string
  title: string
  start_year: number | null
  end_year: number | null
  date_display: string | null
  updated_at: string
}

export interface ArticleSuggestion {
  id: string
  title: string
}

export type RelationConnectionType = 'mention' | 'semantic'

export interface ArticleRef {
  id: string
  title: string
}

/**
 * Arista plana — incluye el id del registro `article_relations` (para
 * permitir borrado quirúrgico desde la UI) más los metadatos de tipo
 * y etiqueta humana cuando la relación es semántica.
 *
 * Mantiene `id` / `title` del artículo del otro extremo para que los
 * componentes que tipan a `ArticleRef` sigan funcionando sin cambios.
 */
export interface ArticleRelationEdge extends ArticleRef {
  relationId: string
  connectionType: RelationConnectionType
  label: string | null
}

export interface ArticleWithRelations extends Article {
  outgoing: ArticleRelationEdge[]
  incoming: ArticleRelationEdge[]
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

// ── Article templates (presets) ────────────────────────────────────────────

/** Lightweight row used in lists and selectors */
export interface ArticleTemplateSummary {
  id: string
  name: string
  created_at: string
}

/** Full template with editable defaults */
export interface ArticleTemplate {
  id: string
  world_id: string
  name: string
  default_header_fields: HeaderField[]
  default_modules: ArticleModule[]
  created_at: string
}

// ── Graph ──────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string
  title: string
  folder_id: string | null
  type: ArticleType
}

export interface GraphLink {
  source: string
  target: string
  connection_type: RelationConnectionType
  relation_label: string | null
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}
