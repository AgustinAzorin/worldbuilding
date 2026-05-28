import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '../common/supabase/supabase.service'
import {
  mentionIdsFromModules,
  stripPrivateBlocks,
  type ArticleModule,
  type ArticleType,
  type HeaderField,
  type RelationConnectionType,
} from '../common/types'

interface EventMetadata {
  type?: ArticleType
  startYear?: number | null
  endYear?: number | null
  dateDisplay?: string | null
}

function buildEventColumns(meta: EventMetadata) {
  const cols: Record<string, unknown> = {}
  if (meta.type !== undefined)         cols.type         = meta.type
  if (meta.startYear !== undefined)    cols.start_year   = meta.startYear
  if (meta.endYear !== undefined)      cols.end_year     = meta.endYear
  if (meta.dateDisplay !== undefined)  cols.date_display = meta.dateDisplay
  return cols
}

// Filas que devuelve Supabase al join-ear article_relations con articles.
interface OutgoingRelationRow {
  id: string
  connection_type: RelationConnectionType
  relation_label: string | null
  diplomacy_score: number | null
  target: { id: string; title: string } | { id: string; title: string }[] | null
}

interface IncomingRelationRow {
  id: string
  connection_type: RelationConnectionType
  relation_label: string | null
  diplomacy_score: number | null
  source: { id: string; title: string } | { id: string; title: string }[] | null
}

export interface FlatRelationEdge {
  relationId: string
  id: string
  title: string
  connectionType: RelationConnectionType
  label: string | null
  /** Sólo presente en aristas semánticas. NULL = sin ponderar. */
  diplomacyScore: number | null
}

function clampDiplomacy(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null
  if (!Number.isInteger(v)) return null
  if (v < -100) return -100
  if (v >  100) return  100
  return v
}

function pickFirst<T>(v: T | T[] | null): T | null {
  if (v === null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

@Injectable()
export class ArticlesService {
  constructor(private readonly supabase: SupabaseService) {}

  async search(
    worldId: string,
    query: string,
    accessToken: string,
    typeFilter?: ArticleType,
  ) {
    let q = this.supabase
      .forUser(accessToken)
      .from('articles')
      .select('id, title')
      .eq('world_id', worldId)
      .ilike('title', `%${query}%`)

    if (typeFilter) q = q.eq('type', typeFilter)

    const { data, error } = await q.order('title').limit(10)

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async getById(articleId: string, userId: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken)

    // Traemos el artículo + user_id del mundo en un solo round-trip para
    // poder evaluar la propiedad y aplicar la niebla de guerra.
    const { data: article, error } = await client
      .from('articles')
      .select('*, world:worlds!inner(user_id)')
      .eq('id', articleId)
      .single()

    if (error) throw new NotFoundException('Article not found')

    const worldUserId =
      (Array.isArray(article.world) ? article.world[0]?.user_id : article.world?.user_id) ?? null
    const isOwner = worldUserId !== null && worldUserId === userId

    const [outResult, inResult] = await Promise.all([
      client
        .from('article_relations')
        .select(
          'id, connection_type, relation_label, diplomacy_score, target:articles!article_relations_target_article_id_fkey(id, title)',
        )
        .eq('source_article_id', articleId),
      client
        .from('article_relations')
        .select(
          'id, connection_type, relation_label, diplomacy_score, source:articles!article_relations_source_article_id_fkey(id, title)',
        )
        .eq('target_article_id', articleId),
    ])

    const outgoing: FlatRelationEdge[] = ((outResult.data ?? []) as OutgoingRelationRow[])
      .map(r => {
        const target = pickFirst(r.target)
        if (!target) return null
        return {
          relationId: r.id,
          id: target.id,
          title: target.title,
          connectionType: r.connection_type,
          label: r.relation_label,
          diplomacyScore: r.diplomacy_score,
        }
      })
      .filter((r): r is FlatRelationEdge => r !== null)

    const incoming: FlatRelationEdge[] = ((inResult.data ?? []) as IncomingRelationRow[])
      .map(r => {
        const source = pickFirst(r.source)
        if (!source) return null
        return {
          relationId: r.id,
          id: source.id,
          title: source.title,
          connectionType: r.connection_type,
          label: r.relation_label,
          diplomacyScore: r.diplomacy_score,
        }
      })
      .filter((r): r is FlatRelationEdge => r !== null)

    const rawHeaderFields = (article.header_fields ?? []) as HeaderField[]
    const rawModules      = (article.modules       ?? []) as ArticleModule[]

    // Niebla de guerra: si el solicitante NO es el dueño del mundo,
    // barremos los arrays JSONB y eliminamos cualquier item privado.
    const header_fields = isOwner ? rawHeaderFields : stripPrivateBlocks(rawHeaderFields)
    const modules       = isOwner ? rawModules      : stripPrivateBlocks(rawModules)

    // Descartamos el join `world` antes de devolver para no filtrar el
    // user_id del propietario a clientes no-owner.
    const { world: _world, ...articleRow } = article as Record<string, unknown> & {
      world: unknown
    }

    return {
      ...articleRow,
      header_fields,
      modules,
      outgoing,
      incoming,
      is_owner: isOwner,
    }
  }

  async create(
    worldId: string,
    title: string,
    headerFields: HeaderField[],
    modules: ArticleModule[],
    accessToken: string,
    eventMeta: EventMetadata = {},
  ) {
    const client = this.supabase.forUser(accessToken)

    const { data, error } = await client
      .from('articles')
      .insert({
        world_id: worldId,
        title,
        header_fields: headerFields,
        modules,
        ...buildEventColumns(eventMeta),
      })
      .select('id')
      .single()

    if (error) throw new InternalServerErrorException(error.message)

    const targetIds = mentionIdsFromModules(modules, data.id)
    if (targetIds.length > 0) {
      await client.from('article_relations').insert(
        targetIds.map(targetId => ({
          source_article_id: data.id,
          target_article_id: targetId,
          connection_type:   'mention',
        })),
      )
    }

    return data
  }

  async update(
    articleId: string,
    worldId: string,
    title: string,
    headerFields: HeaderField[],
    modules: ArticleModule[],
    accessToken: string,
    eventMeta: EventMetadata = {},
  ) {
    const client = this.supabase.forUser(accessToken)

    const { error: updateError } = await client
      .from('articles')
      .update({
        title,
        header_fields: headerFields,
        modules,
        ...buildEventColumns(eventMeta),
      })
      .eq('id', articleId)
      .eq('world_id', worldId)

    if (updateError) throw new InternalServerErrorException(updateError.message)

    const targetIds = mentionIdsFromModules(modules, articleId)

    // El RPC solo borra/inserta aristas con connection_type='mention',
    // dejando intactas las relaciones semánticas declaradas por el usuario.
    const { error: rpcError } = await client.rpc('sync_article_relations', {
      p_source_id: articleId,
      p_target_ids: targetIds,
    })

    if (rpcError) throw new InternalServerErrorException(rpcError.message)
  }

  // ── Semantic relations CRUD ─────────────────────────────────────────────

  async listSemanticRelations(articleId: string, accessToken: string): Promise<FlatRelationEdge[]> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('article_relations')
      .select(
        'id, connection_type, relation_label, diplomacy_score, target:articles!article_relations_target_article_id_fkey(id, title)',
      )
      .eq('source_article_id', articleId)
      .eq('connection_type', 'semantic')
      .order('relation_label', { ascending: true, nullsFirst: false })

    if (error) throw new InternalServerErrorException(error.message)

    return ((data ?? []) as OutgoingRelationRow[])
      .map(r => {
        const target = pickFirst(r.target)
        if (!target) return null
        return {
          relationId: r.id,
          id: target.id,
          title: target.title,
          connectionType: r.connection_type,
          label: r.relation_label,
          diplomacyScore: r.diplomacy_score,
        }
      })
      .filter((r): r is FlatRelationEdge => r !== null)
  }

  async createSemanticRelation(
    sourceId: string,
    targetId: string,
    label: string,
    diplomacyScore: number | null | undefined,
    accessToken: string,
  ): Promise<FlatRelationEdge> {
    const trimmedLabel = label.trim()
    if (!trimmedLabel) throw new BadRequestException('label is required')
    if (sourceId === targetId) {
      throw new BadRequestException('source and target must differ')
    }

    const score = clampDiplomacy(diplomacyScore)

    const client = this.supabase.forUser(accessToken)

    // Verificar que source y target pertenezcan al mismo mundo del usuario.
    // RLS de articles bloquea los artículos ajenos → con verlos basta.
    const { data: pair, error: pairErr } = await client
      .from('articles')
      .select('id, world_id, title')
      .in('id', [sourceId, targetId])

    if (pairErr) throw new InternalServerErrorException(pairErr.message)
    if (!pair || pair.length !== 2) {
      throw new NotFoundException('source or target article not found')
    }
    if (pair[0].world_id !== pair[1].world_id) {
      throw new ForbiddenException('articles must belong to the same world')
    }

    const target = pair.find(a => a.id === targetId)!

    const { data: inserted, error: insErr } = await client
      .from('article_relations')
      .insert({
        source_article_id: sourceId,
        target_article_id: targetId,
        connection_type:   'semantic',
        relation_label:    trimmedLabel,
        diplomacy_score:   score,
      })
      .select('id')
      .single()

    if (insErr) {
      // Violación de unique parcial: misma (source, target, label) ya existe.
      if (insErr.code === '23505') {
        throw new BadRequestException('semantic relation already exists with that label')
      }
      throw new InternalServerErrorException(insErr.message)
    }

    return {
      relationId: inserted.id,
      id: target.id,
      title: target.title,
      connectionType: 'semantic',
      label: trimmedLabel,
      diplomacyScore: score,
    }
  }

  async updateSemanticRelationDiplomacy(
    relationId: string,
    diplomacyScore: number | null,
    accessToken: string,
  ): Promise<void> {
    const score = clampDiplomacy(diplomacyScore)
    const client = this.supabase.forUser(accessToken)

    const { data, error } = await client
      .from('article_relations')
      .update({ diplomacy_score: score })
      .eq('id', relationId)
      .eq('connection_type', 'semantic')
      .select('id')

    if (error) throw new InternalServerErrorException(error.message)
    if (!data || data.length === 0) {
      throw new NotFoundException('semantic relation not found')
    }
  }

  async deleteSemanticRelation(relationId: string, accessToken: string): Promise<void> {
    const client = this.supabase.forUser(accessToken)

    // RLS sólo permite borrar relaciones cuyo source pertenezca al usuario.
    // Filtramos además por connection_type para que esta ruta no pueda
    // borrar accidentalmente una arista 'mention' (esas se sincronizan
    // desde el editor).
    const { data, error } = await client
      .from('article_relations')
      .delete()
      .eq('id', relationId)
      .eq('connection_type', 'semantic')
      .select('id')

    if (error) throw new InternalServerErrorException(error.message)
    if (!data || data.length === 0) {
      throw new NotFoundException('semantic relation not found')
    }
  }
}
