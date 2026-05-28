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
  /** Niebla de guerra: el server filtra estos para no-propietarios. */
  is_private?: boolean
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
  | 'organization-membership'
  | 'lifeline'

interface ArticleModuleBase {
  id: string
  title: string
  /** Niebla de guerra: el server filtra estos para no-propietarios. */
  is_private?: boolean
}

export interface RichTextModule extends ArticleModuleBase {
  type: 'rich-text'
  data: { doc: TipTapContent }
}

export interface ImageModule extends ArticleModuleBase {
  type: 'image'
  data: { url: string | null; path: string | null; alt: string }
}

export interface ChartRow {
  id: string
  attribute: string
  value: number
}

export interface ChartModule extends ArticleModuleBase {
  type: 'chart'
  data: { kind: 'radar' | 'bar'; rows: ChartRow[] }
}

export interface RelationsGraphModule extends ArticleModuleBase {
  type: 'relations-graph'
  data: Record<string, never>
}

export interface TableColumn { id: string; label: string }
export interface TableRow    { id: string; cells: Record<string, string> }

export interface TableModule extends ArticleModuleBase {
  type: 'table'
  data: { columns: TableColumn[]; rows: TableRow[] }
}

export interface RelationsManagerModule extends ArticleModuleBase {
  type: 'relations-manager'
  data: Record<string, never>
}

export interface FamilyTreeModule extends ArticleModuleBase {
  type: 'family-tree'
  /** Referencia a un árbol genealógico del mundo. `null` = sin asignar. */
  data: { treeId: string | null }
}

/**
 * Membresías a organizaciones del mundo.
 *
 * El módulo NO persiste estado propio: las membresías viven en
 * `article_relations` (connection_type='semantic',
 * relation_label='Miembro de'). El componente sólo expone la UI para
 * crearlas/borrarlas desde el editor del artículo "miembro".
 */
export interface OrganizationMembershipModule extends ArticleModuleBase {
  type: 'organization-membership'
  data: Record<string, never>
}

/** Hito de la línea de vida interna (biografía / cronología institucional). */
export interface LifelineMilestone {
  id: string
  /** Año numérico — sólo se usa para ordenar ascendentemente. */
  year: number
  /** Etiqueta humana de la fecha (ej: "Año 45 de la Segunda Era"). */
  date_display: string
  title: string
  description: string
}

export interface LifelineModule extends ArticleModuleBase {
  type: 'lifeline'
  data: { milestones: LifelineMilestone[] }
}

export type ArticleModule =
  | RichTextModule
  | ImageModule
  | ChartModule
  | RelationsGraphModule
  | TableModule
  | RelationsManagerModule
  | FamilyTreeModule
  | OrganizationMembershipModule
  | LifelineModule

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
      return { id, type, title: 'Árbol genealógico', data: { treeId: null } }
    case 'organization-membership':
      return { id, type, title: 'Membresías', data: {} }
    case 'lifeline':
      return { id, type, title: 'Línea de vida', data: { milestones: [] } }
  }
}

// ── API response shapes ────────────────────────────────────────────────────

export interface World {
  id: string
  title: string
  user_id: string
  created_at: string
}

export type ArticleType = 'document' | 'event' | 'organization'

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
  /** Sólo presente en aristas semánticas. NULL = sin ponderar. */
  diplomacyScore: number | null
}

export interface ArticleWithRelations extends Article {
  outgoing: ArticleRelationEdge[]
  incoming: ArticleRelationEdge[]
  /** True si el usuario actual es dueño del mundo del artículo. */
  is_owner: boolean
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

// ── Organizations (panel macro) ────────────────────────────────────────────

/** Fila usada por el panel /worlds/[id]/organizations. */
export interface OrganizationSummary {
  id: string
  title: string
  created_at: string
  updated_at: string
  /** Conteo de aristas semánticas "Miembro de" apuntando a esta organización. */
  members_count: number
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
  /** Sólo presente en aristas semánticas. NULL = sin ponderar. */
  diplomacy_score: number | null
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

// ── Family trees ───────────────────────────────────────────────────────────

export interface FamilyTreeSummary {
  id: string
  world_id: string
  name: string
  description: string | null
  member_count: number
  edge_count: number
  created_at: string
  updated_at: string
}

export interface FamilyTreeEdgeRow {
  id: string
  parent_id: string
  child_id: string
}

export interface FamilyTreeDetail {
  id: string
  world_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  members: ArticleRef[]
  edges: FamilyTreeEdgeRow[]
}
