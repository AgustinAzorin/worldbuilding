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

export type ArticleType = 'document' | 'event'

export const ARTICLE_TYPES: ReadonlyArray<ArticleType> = ['document', 'event']

export function isArticleType(v: unknown): v is ArticleType {
  return v === 'document' || v === 'event'
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

// ── Type guards (validación en runtime para DTOs) ─────────────────────────

const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export function isHeaderField(v: unknown): v is HeaderField {
  if (!isObj(v)) return false
  return (
    isStr(v.id) &&
    isStr(v.label) &&
    isStr(v.value) &&
    (v.type === 'text' || v.type === 'number')
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

export function isArticleModule(v: unknown): v is ArticleModule {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.title)) return false
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
      return isObj(data) && Object.keys(data).length === 0
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
