// ── TipTap JSON types (usados dentro de los módulos rich-text) ────────────

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

// ── Tipo de artículo ──────────────────────────────────────────────────────

export type ArticleType = 'document' | 'event' | 'organization'

export const ARTICLE_TYPES: ReadonlyArray<ArticleType> = [
  'document',
  'event',
  'organization',
]

export function isArticleType(v: unknown): v is ArticleType {
  return v === 'document' || v === 'event' || v === 'organization'
}

// ── Cartografía: tipo de marcador (pin) ───────────────────────────────────

export type PinType = 'npc' | 'item' | 'event' | 'faction' | 'location'

export const PIN_TYPES: ReadonlyArray<PinType> = [
  'npc',
  'item',
  'event',
  'faction',
  'location',
]

export function isPinType(v: unknown): v is PinType {
  return (
    v === 'npc' ||
    v === 'item' ||
    v === 'event' ||
    v === 'faction' ||
    v === 'location'
  )
}

// ── Article relations ─────────────────────────────────────────────────────

export type RelationConnectionType = 'mention' | 'semantic'

export function isRelationConnectionType(v: unknown): v is RelationConnectionType {
  return v === 'mention' || v === 'semantic'
}

// ── Header fields (ficha técnica ordenada) ────────────────────────────────

export type HeaderFieldType = 'text' | 'number'

export interface HeaderField {
  id: string
  label: string
  value: string
  type: HeaderFieldType
  /** Niebla de guerra: si es true, el server lo recorta para no-propietarios. */
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

/** Campos comunes a todos los módulos — incluyendo la niebla de guerra. */
interface ArticleModuleBase {
  id: string
  title: string
  /** Niebla de guerra: si es true, el server lo recorta para no-propietarios. */
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
 * Membresías de organización. El módulo no almacena estado propio: las
 * pertenencias viven en `article_relations` con connection_type='semantic'
 * y relation_label='Miembro de'. El componente sólo es la interfaz para
 * declarar/borrar esas aristas desde el editor del artículo.
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

// ── Type guards (validación en runtime para DTOs) ─────────────────────────

const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isOptBool = (v: unknown): boolean => v === undefined || typeof v === 'boolean'

export function isHeaderField(v: unknown): v is HeaderField {
  if (!isObj(v)) return false
  return (
    isStr(v.id) &&
    isStr(v.label) &&
    isStr(v.value) &&
    (v.type === 'text' || v.type === 'number') &&
    isOptBool(v.is_private)
  )
}

export function isHeaderFieldsArray(v: unknown): v is HeaderField[] {
  return Array.isArray(v) && v.every(isHeaderField)
}

function isTipTapContent(v: unknown): v is TipTapContent {
  return isObj(v) && v.type === 'doc' && Array.isArray(v.content)
}

function isChartRow(v: unknown): v is ChartRow {
  return isObj(v) && isStr(v.id) && isStr(v.attribute) && isNum(v.value)
}

function isTableColumn(v: unknown): v is TableColumn {
  return isObj(v) && isStr(v.id) && isStr(v.label)
}

function isTableRow(v: unknown): v is TableRow {
  if (!isObj(v) || !isStr(v.id) || !isObj(v.cells)) return false
  return Object.values(v.cells).every(isStr)
}

function isLifelineMilestone(v: unknown): v is LifelineMilestone {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isNum(v.year) &&
    isStr(v.date_display) &&
    isStr(v.title) &&
    isStr(v.description)
  )
}

export function isArticleModule(v: unknown): v is ArticleModule {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.title)) return false
  if (!isOptBool(v.is_private)) return false
  const data = v.data
  switch (v.type) {
    case 'rich-text':
      return isObj(data) && isTipTapContent(data.doc)
    case 'image':
      return (
        isObj(data) &&
        (data.url === null || isStr(data.url)) &&
        (data.path === null || isStr(data.path)) &&
        isStr(data.alt)
      )
    case 'chart':
      return (
        isObj(data) &&
        (data.kind === 'radar' || data.kind === 'bar') &&
        Array.isArray(data.rows) && data.rows.every(isChartRow)
      )
    case 'relations-graph':
    case 'relations-manager':
    case 'organization-membership':
      return isObj(data) && Object.keys(data).length === 0
    case 'family-tree':
      // Aceptamos `data: {}` (módulos pre-migración) y `{ treeId: string|null }`.
      if (!isObj(data)) return false
      if (!('treeId' in data)) return Object.keys(data).length === 0
      return data.treeId === null || isStr(data.treeId)
    case 'lifeline':
      return (
        isObj(data) &&
        Array.isArray(data.milestones) &&
        data.milestones.every(isLifelineMilestone)
      )
    case 'table':
      return (
        isObj(data) &&
        Array.isArray(data.columns) && data.columns.every(isTableColumn) &&
        Array.isArray(data.rows)    && data.rows.every(isTableRow)
      )
    default:
      return false
  }
}

export function isArticleModulesArray(v: unknown): v is ArticleModule[] {
  return Array.isArray(v) && v.every(isArticleModule)
}

// ── Extracción de menciones desde módulos rich-text ───────────────────────

function collectMentionIds(node: TipTapNode, acc: string[]): void {
  if (node.type === 'mention' && typeof node.attrs?.id === 'string') {
    acc.push(node.attrs.id)
  }
  node.content?.forEach(child => collectMentionIds(child, acc))
}

/**
 * Recorre todos los módulos `rich-text` del artículo y devuelve los ids
 * únicos referenciados vía menciones, opcionalmente excluyendo el propio
 * artículo para evitar self-references.
 */
export function mentionIdsFromModules(modules: ArticleModule[], excludeId?: string): string[] {
  const ids: string[] = []
  for (const m of modules) {
    if (m.type !== 'rich-text') continue
    m.data.doc.content.forEach(node => collectMentionIds(node, ids))
  }
  return [...new Set(ids)].filter(id => id !== excludeId)
}

// ── Niebla de guerra ──────────────────────────────────────────────────────

/**
 * Recorta los elementos marcados con `is_private: true`.
 * El filtro se aplica antes de enviar el JSONB al cliente cuando el
 * solicitante NO es el propietario del mundo.
 */
export function stripPrivateBlocks<T extends { is_private?: boolean }>(
  items: T[],
): T[] {
  return items.filter(item => item.is_private !== true)
}
