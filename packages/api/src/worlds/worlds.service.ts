import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '../common/supabase/supabase.service'

@Injectable()
export class WorldsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(accessToken: string) {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('worlds')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async create(userId: string, title: string, accessToken: string) {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('worlds')
      .insert({ title, user_id: userId })
      .select('*')
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async getById(worldId: string, accessToken: string) {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('worlds')
      .select('id, title, created_at')
      .eq('id', worldId)
      .single()

    if (error) throw new NotFoundException('World not found')
    return data
  }

  async listArticles(worldId: string, accessToken: string) {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('articles')
      .select('id, title, created_at, updated_at')
      .eq('world_id', worldId)
      .order('updated_at', { ascending: false })

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  /**
   * Returns all folders and articles for a world as flat lists.
   * The frontend assembles the tree from parent_id / folder_id references.
   */
  async getFolderTree(worldId: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken)

    const [foldersRes, articlesRes] = await Promise.all([
      client
        .from('folders')
        .select('id, name, world_id, parent_id, created_at')
        .eq('world_id', worldId)
        .order('name'),
      client
        .from('articles')
        .select('id, title, folder_id, updated_at')
        .eq('world_id', worldId)
        .order('title'),
    ])

    if (foldersRes.error) throw new InternalServerErrorException(foldersRes.error.message)
    if (articlesRes.error) throw new InternalServerErrorException(articlesRes.error.message)

    return { folders: foldersRes.data, articles: articlesRes.data }
  }

  /**
   * Returns graph-ready data: article nodes + directed relation links.
   * Only includes relations where the source article belongs to this world.
   */
  async getGraphData(worldId: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken)

    const { data: articles, error: artErr } = await client
      .from('articles')
      .select('id, title, folder_id, type')
      .eq('world_id', worldId)

    if (artErr) throw new InternalServerErrorException(artErr.message)
    if (!articles || articles.length === 0) return { nodes: [], links: [] }

    const articleIds = articles.map(a => a.id)

    const [relRes, treeEdgesRes] = await Promise.all([
      client
        .from('article_relations')
        .select(
          'source_article_id, target_article_id, connection_type, relation_label, diplomacy_score',
        )
        .in('source_article_id', articleIds),
      // Aristas de árboles genealógicos del mundo: las metemos al grafo
      // como links semánticos sintéticos parent → child con label
      // "Parentesco" para que la visualización siga reflejándolas.
      client
        .from('family_tree_edges')
        .select('parent_article_id, child_article_id, tree:family_trees!inner(world_id)')
        .eq('tree.world_id', worldId),
    ])

    if (relRes.error)       throw new InternalServerErrorException(relRes.error.message)
    if (treeEdgesRes.error) throw new InternalServerErrorException(treeEdgesRes.error.message)

    const relLinks = (relRes.data ?? []).map(r => ({
      source: r.source_article_id as string,
      target: r.target_article_id as string,
      connection_type:
        ((r.connection_type as string) === 'semantic' ? 'semantic' : 'mention') as
          | 'semantic'
          | 'mention',
      relation_label: (r.relation_label as string | null) ?? null,
      diplomacy_score: (r.diplomacy_score as number | null) ?? null,
    }))

    const treeLinks = (treeEdgesRes.data ?? []).map(e => ({
      source: e.parent_article_id as string,
      target: e.child_article_id  as string,
      connection_type: 'semantic' as const,
      relation_label: 'Parentesco',
      diplomacy_score: null,
    }))

    return {
      nodes: articles.map(a => ({
        id: a.id,
        title: a.title,
        folder_id: a.folder_id as string | null,
        type: ((a.type as string) === 'event' ? 'event' : 'document') as
          | 'document'
          | 'event',
      })),
      links: [...relLinks, ...treeLinks],
    }
  }

  async listTrees(worldId: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken)

    const { data: trees, error } = await client
      .from('family_trees')
      .select('id, world_id, name, description, created_at, updated_at')
      .eq('world_id', worldId)
      .order('created_at', { ascending: true })

    if (error) throw new InternalServerErrorException(error.message)
    if (!trees || trees.length === 0) return []

    const treeIds = trees.map(t => t.id as string)
    const { data: edges, error: edgesErr } = await client
      .from('family_tree_edges')
      .select('tree_id, parent_article_id, child_article_id')
      .in('tree_id', treeIds)
    if (edgesErr) throw new InternalServerErrorException(edgesErr.message)

    const memberSet = new Map<string, Set<string>>()
    const edgeCount = new Map<string, number>()
    for (const e of edges ?? []) {
      const tid = e.tree_id as string
      edgeCount.set(tid, (edgeCount.get(tid) ?? 0) + 1)
      let s = memberSet.get(tid)
      if (!s) { s = new Set(); memberSet.set(tid, s) }
      s.add(e.parent_article_id as string)
      s.add(e.child_article_id as string)
    }

    return trees.map(t => ({
      id: t.id as string,
      world_id: t.world_id as string,
      name: t.name as string,
      description: (t.description as string | null) ?? null,
      member_count: memberSet.get(t.id as string)?.size ?? 0,
      edge_count:   edgeCount.get(t.id as string) ?? 0,
      created_at: t.created_at as string,
      updated_at: t.updated_at as string,
    }))
  }

  /**
   * Devuelve los artículos marcados como `type = 'event'` para un mundo,
   * ordenados ascendentemente por `start_year`. Los eventos sin
   * `start_year` quedan al final (NULLS LAST) para que la timeline pueda
   * mostrarlos en una sección "sin fecha".
   */
  async getTimelineEvents(worldId: string, accessToken: string) {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('articles')
      .select('id, title, start_year, end_year, date_display, updated_at')
      .eq('world_id', worldId)
      .eq('type', 'event')
      .order('start_year', { ascending: true, nullsFirst: false })

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }
}
