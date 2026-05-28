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

    const [relRes, treeEdgesRes, partnershipsRes] = await Promise.all([
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
      // Parejas / cónyuges: links simétricos etiquetados "Pareja".
      client
        .from('family_tree_partnerships')
        .select('member_a_id, member_b_id, tree:family_trees!inner(world_id)')
        .eq('tree.world_id', worldId),
    ])

    if (relRes.error)         throw new InternalServerErrorException(relRes.error.message)
    if (treeEdgesRes.error)   throw new InternalServerErrorException(treeEdgesRes.error.message)
    if (partnershipsRes.error) throw new InternalServerErrorException(partnershipsRes.error.message)

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

    const partnerLinks = (partnershipsRes.data ?? []).map(p => ({
      source: p.member_a_id as string,
      target: p.member_b_id as string,
      connection_type: 'semantic' as const,
      relation_label: 'Pareja',
      diplomacy_score: null,
    }))

    return {
      nodes: articles.map(a => {
        const raw = a.type as string
        const t: 'document' | 'event' | 'organization' =
          raw === 'event'        ? 'event' :
          raw === 'organization' ? 'organization' :
                                   'document'
        return {
          id: a.id,
          title: a.title,
          folder_id: a.folder_id as string | null,
          type: t,
        }
      }),
      links: [...relLinks, ...treeLinks, ...partnerLinks],
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
    const [edgesRes, partsRes] = await Promise.all([
      client
        .from('family_tree_edges')
        .select('tree_id, parent_article_id, child_article_id')
        .in('tree_id', treeIds),
      client
        .from('family_tree_partnerships')
        .select('tree_id, member_a_id, member_b_id')
        .in('tree_id', treeIds),
    ])
    if (edgesRes.error) throw new InternalServerErrorException(edgesRes.error.message)
    if (partsRes.error) throw new InternalServerErrorException(partsRes.error.message)

    const memberSet = new Map<string, Set<string>>()
    const edgeCount = new Map<string, number>()
    const ensure = (tid: string) => {
      let s = memberSet.get(tid)
      if (!s) { s = new Set(); memberSet.set(tid, s) }
      return s
    }
    for (const e of edgesRes.data ?? []) {
      const tid = e.tree_id as string
      edgeCount.set(tid, (edgeCount.get(tid) ?? 0) + 1)
      const s = ensure(tid)
      s.add(e.parent_article_id as string)
      s.add(e.child_article_id as string)
    }
    for (const p of partsRes.data ?? []) {
      const s = ensure(p.tree_id as string)
      s.add(p.member_a_id as string)
      s.add(p.member_b_id as string)
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
   * Devuelve todas las organizaciones (artículos con type='organization')
   * del mundo, ordenadas alfabéticamente, con el conteo de miembros
   * (aristas semánticas con relation_label='Miembro de' apuntando a la
   * organización). El conteo se resuelve en un único round-trip y se
   * agrupa en memoria — más simple que un RPC dedicado y suficiente para
   * la escala del panel macro.
   */
  async listOrganizations(worldId: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken)

    const { data: orgs, error: orgErr } = await client
      .from('articles')
      .select('id, title, updated_at, created_at, org_parent_id, org_sort_order')
      .eq('world_id', worldId)
      .eq('type', 'organization')
      .order('org_sort_order', { ascending: true })
      .order('title', { ascending: true })

    if (orgErr) throw new InternalServerErrorException(orgErr.message)
    if (!orgs || orgs.length === 0) return []

    const orgIds = orgs.map(o => o.id as string)
    const { data: rels, error: relErr } = await client
      .from('article_relations')
      .select('target_article_id')
      .in('target_article_id', orgIds)
      .eq('connection_type', 'semantic')
      .eq('relation_label', 'Miembro de')

    if (relErr) throw new InternalServerErrorException(relErr.message)

    const counts = new Map<string, number>()
    for (const r of rels ?? []) {
      const tid = r.target_article_id as string
      counts.set(tid, (counts.get(tid) ?? 0) + 1)
    }

    return orgs.map(o => ({
      id: o.id as string,
      title: o.title as string,
      created_at: o.created_at as string,
      updated_at: o.updated_at as string,
      parent_id: (o.org_parent_id as string | null) ?? null,
      sort_order: (o.org_sort_order as number | null) ?? 0,
      members_count: counts.get(o.id as string) ?? 0,
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
