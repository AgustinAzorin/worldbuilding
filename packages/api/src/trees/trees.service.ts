import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '../common/supabase/supabase.service'

export interface TreeSummary {
  id: string
  world_id: string
  name: string
  description: string | null
  member_count: number
  edge_count: number
  created_at: string
  updated_at: string
}

export interface TreeMember {
  id: string
  title: string
}

export type ParentRelationType = 'biological' | 'adopted' | 'bastard'
export type PartnerRelationType = 'spouse' | 'partner' | 'betrothed'

const PARENT_RELATION_TYPES: ParentRelationType[] = ['biological', 'adopted', 'bastard']
const PARTNER_RELATION_TYPES: PartnerRelationType[] = ['spouse', 'partner', 'betrothed']

export interface TreeEdge {
  id: string
  parent_id: string
  child_id: string
  relation_type: ParentRelationType
}

export interface TreePartnership {
  id: string
  member_a_id: string
  member_b_id: string
  relation_type: PartnerRelationType
}

export interface TreeDetail {
  id: string
  world_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  members: TreeMember[]
  edges: TreeEdge[]
  partnerships: TreePartnership[]
}

interface EdgeRow {
  id: string
  parent_article_id: string
  child_article_id: string
  relation_type: ParentRelationType
}

interface PartnershipRow {
  id: string
  member_a_id: string
  member_b_id: string
  relation_type: PartnerRelationType
}

@Injectable()
export class TreesService {
  constructor(private readonly supabase: SupabaseService) {}

  /** Lista compacta de árboles de un mundo, con contadores derivados. */
  async listByWorld(worldId: string, accessToken: string): Promise<TreeSummary[]> {
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
      const tid = p.tree_id as string
      const s = ensure(tid)
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

  async getById(treeId: string, accessToken: string): Promise<TreeDetail> {
    const client = this.supabase.forUser(accessToken)

    const { data: tree, error } = await client
      .from('family_trees')
      .select('id, world_id, name, description, created_at, updated_at')
      .eq('id', treeId)
      .single()

    if (error) throw new NotFoundException('Tree not found')

    const [edgesRes, partsRes] = await Promise.all([
      client
        .from('family_tree_edges')
        .select('id, parent_article_id, child_article_id, relation_type')
        .eq('tree_id', treeId)
        .order('created_at', { ascending: true }),
      client
        .from('family_tree_partnerships')
        .select('id, member_a_id, member_b_id, relation_type')
        .eq('tree_id', treeId)
        .order('created_at', { ascending: true }),
    ])

    if (edgesRes.error) throw new InternalServerErrorException(edgesRes.error.message)
    if (partsRes.error) throw new InternalServerErrorException(partsRes.error.message)

    const edgeRows = (edgesRes.data ?? []) as EdgeRow[]
    const partRows = (partsRes.data ?? []) as PartnershipRow[]
    const memberIds = new Set<string>()
    for (const e of edgeRows) {
      memberIds.add(e.parent_article_id)
      memberIds.add(e.child_article_id)
    }
    for (const p of partRows) {
      memberIds.add(p.member_a_id)
      memberIds.add(p.member_b_id)
    }

    let members: TreeMember[] = []
    if (memberIds.size > 0) {
      const { data: arts, error: artsErr } = await client
        .from('articles')
        .select('id, title')
        .in('id', [...memberIds])
      if (artsErr) throw new InternalServerErrorException(artsErr.message)
      members = (arts ?? []) as TreeMember[]
    }

    return {
      id: tree.id as string,
      world_id: tree.world_id as string,
      name: tree.name as string,
      description: (tree.description as string | null) ?? null,
      created_at: tree.created_at as string,
      updated_at: tree.updated_at as string,
      members,
      edges: edgeRows.map(e => ({
        id: e.id,
        parent_id: e.parent_article_id,
        child_id:  e.child_article_id,
        relation_type: e.relation_type,
      })),
      partnerships: partRows.map(p => ({
        id: p.id,
        member_a_id: p.member_a_id,
        member_b_id: p.member_b_id,
        relation_type: p.relation_type,
      })),
    }
  }

  async create(
    worldId: string,
    name: string,
    description: string | null | undefined,
    accessToken: string,
  ) {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('family_trees')
      .insert({
        world_id: worldId,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select('id, world_id, name, description, created_at, updated_at')
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async update(
    treeId: string,
    patch: { name?: string; description?: string | null },
    accessToken: string,
  ): Promise<void> {
    const update: Record<string, unknown> = {}
    if (patch.name !== undefined) update.name = patch.name.trim()
    if (patch.description !== undefined) {
      update.description = patch.description?.trim() || null
    }
    if (Object.keys(update).length === 0) return

    const { error } = await this.supabase
      .forUser(accessToken)
      .from('family_trees')
      .update(update)
      .eq('id', treeId)

    if (error) throw new InternalServerErrorException(error.message)
  }

  async remove(treeId: string, accessToken: string): Promise<void> {
    const { error } = await this.supabase
      .forUser(accessToken)
      .from('family_trees')
      .delete()
      .eq('id', treeId)

    if (error) throw new InternalServerErrorException(error.message)
  }

  // ── Edges ───────────────────────────────────────────────────────────────

  async addEdge(
    treeId: string,
    parentId: string,
    childId: string,
    relationType: ParentRelationType | undefined,
    accessToken: string,
  ): Promise<TreeEdge> {
    if (parentId === childId) {
      throw new BadRequestException('parent and child must differ')
    }

    const type: ParentRelationType =
      relationType && PARENT_RELATION_TYPES.includes(relationType)
        ? relationType
        : 'biological'

    const client = this.supabase.forUser(accessToken)

    // Verificamos que tree + ambos artículos vivan en el mismo mundo
    // (RLS bloquea acceso ajeno, así que basta con poder leerlos).
    const tree = await this.requireTreeWorld(client, treeId)
    await this.requireSameWorldArticles(client, tree.world_id, [parentId, childId])

    // Validación contra ciclos: el nuevo padre no puede ser descendiente
    // del nuevo hijo dentro de este árbol.
    if (await this.wouldCreateCycle(client, treeId, parentId, childId)) {
      throw new BadRequestException('adding this edge would create a cycle')
    }

    const { data: inserted, error: insErr } = await client
      .from('family_tree_edges')
      .insert({
        tree_id: treeId,
        parent_article_id: parentId,
        child_article_id:  childId,
        relation_type: type,
      })
      .select('id, parent_article_id, child_article_id, relation_type')
      .single()

    if (insErr) {
      if (insErr.code === '23505') {
        throw new BadRequestException('edge already exists')
      }
      throw new InternalServerErrorException(insErr.message)
    }

    return {
      id: inserted.id as string,
      parent_id: inserted.parent_article_id as string,
      child_id:  inserted.child_article_id as string,
      relation_type: inserted.relation_type as ParentRelationType,
    }
  }

  async removeEdge(edgeId: string, accessToken: string): Promise<void> {
    const client = this.supabase.forUser(accessToken)
    const { data, error } = await client
      .from('family_tree_edges')
      .delete()
      .eq('id', edgeId)
      .select('id')

    if (error) throw new InternalServerErrorException(error.message)
    if (!data || data.length === 0) {
      throw new NotFoundException('edge not found')
    }
  }

  // ── Partnerships (pareja / cónyuge) ───────────────────────────────────────

  async addPartnership(
    treeId: string,
    memberAId: string,
    memberBId: string,
    relationType: PartnerRelationType | undefined,
    accessToken: string,
  ): Promise<TreePartnership> {
    if (memberAId === memberBId) {
      throw new BadRequestException('a partnership needs two distinct members')
    }

    const type: PartnerRelationType =
      relationType && PARTNER_RELATION_TYPES.includes(relationType)
        ? relationType
        : 'partner'

    const client = this.supabase.forUser(accessToken)
    const tree = await this.requireTreeWorld(client, treeId)
    await this.requireSameWorldArticles(client, tree.world_id, [memberAId, memberBId])

    const { data: inserted, error: insErr } = await client
      .from('family_tree_partnerships')
      .insert({
        tree_id: treeId,
        member_a_id: memberAId,
        member_b_id: memberBId,
        relation_type: type,
      })
      .select('id, member_a_id, member_b_id, relation_type')
      .single()

    if (insErr) {
      if (insErr.code === '23505') {
        throw new BadRequestException('partnership already exists')
      }
      throw new InternalServerErrorException(insErr.message)
    }

    return {
      id: inserted.id as string,
      member_a_id: inserted.member_a_id as string,
      member_b_id: inserted.member_b_id as string,
      relation_type: inserted.relation_type as PartnerRelationType,
    }
  }

  async removePartnership(partnershipId: string, accessToken: string): Promise<void> {
    const client = this.supabase.forUser(accessToken)
    const { data, error } = await client
      .from('family_tree_partnerships')
      .delete()
      .eq('id', partnershipId)
      .select('id')

    if (error) throw new InternalServerErrorException(error.message)
    if (!data || data.length === 0) {
      throw new NotFoundException('partnership not found')
    }
  }

  // ── Helpers compartidos ───────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async requireTreeWorld(client: any, treeId: string): Promise<{ id: string; world_id: string }> {
    const { data: tree, error } = await client
      .from('family_trees')
      .select('id, world_id')
      .eq('id', treeId)
      .single()
    if (error) throw new NotFoundException('Tree not found')
    return tree as { id: string; world_id: string }
  }

  private async requireSameWorldArticles(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: any,
    worldId: string,
    ids: string[],
  ): Promise<void> {
    const { data: arts, error } = await client
      .from('articles')
      .select('id, world_id')
      .in('id', ids)
    if (error) throw new InternalServerErrorException(error.message)
    if (!arts || arts.length !== ids.length) {
      throw new NotFoundException('one or more articles not found')
    }
    if (arts.some((a: { world_id: string }) => a.world_id !== worldId)) {
      throw new ForbiddenException('articles must belong to the same world as the tree')
    }
  }

  /**
   * BFS desde `prospectiveParent` siguiendo aristas existentes en sentido
   * child → parent (es decir, "subiendo"). Si en ese camino aparece
   * `prospectiveChild`, agregar la arista crearía un ciclo.
   */
  private async wouldCreateCycle(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: any,
    treeId: string,
    prospectiveParent: string,
    prospectiveChild: string,
  ): Promise<boolean> {
    const { data: edges, error } = await client
      .from('family_tree_edges')
      .select('parent_article_id, child_article_id')
      .eq('tree_id', treeId)
    if (error) throw new InternalServerErrorException(error.message)

    // Adyacencia child → parents (subimos en el árbol).
    const upFromChild = new Map<string, string[]>()
    for (const e of (edges ?? []) as { parent_article_id: string; child_article_id: string }[]) {
      const list = upFromChild.get(e.child_article_id) ?? []
      list.push(e.parent_article_id)
      upFromChild.set(e.child_article_id, list)
    }

    // ¿prospectiveChild es ancestro de prospectiveParent en el árbol actual?
    const seen = new Set<string>([prospectiveParent])
    const queue: string[] = [prospectiveParent]
    while (queue.length > 0) {
      const node = queue.shift()!
      if (node === prospectiveChild) return true
      for (const p of upFromChild.get(node) ?? []) {
        if (seen.has(p)) continue
        seen.add(p)
        queue.push(p)
      }
    }
    return false
  }
}
