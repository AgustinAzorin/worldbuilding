import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '../common/supabase/supabase.service'

interface OrgRow {
  id: string
  world_id: string
  type: string
  org_parent_id: string | null
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Reubica una facción dentro de la jerarquía: define (o limpia) su
   * facción madre. Valida que ambas sean organizaciones del mismo mundo
   * y que el movimiento no genere un ciclo (la madre no puede ser
   * descendiente de la propia facción). Al cambiar de madre, la facción
   * se ubica al final del nuevo grupo de hermanas.
   */
  async setParent(
    orgId: string,
    parentId: string | null,
    accessToken: string,
  ): Promise<void> {
    if (parentId === orgId) {
      throw new BadRequestException('a faction cannot be its own parent')
    }

    const client = this.supabase.forUser(accessToken)
    const org = await this.requireOrg(client, orgId)

    if (parentId) {
      const parent = await this.requireOrg(client, parentId)
      if (parent.world_id !== org.world_id) {
        throw new ForbiddenException('parent must belong to the same world')
      }
      if (await this.isDescendant(client, org.world_id, parentId, orgId)) {
        throw new BadRequestException('that move would create a cycle in the hierarchy')
      }
    }

    // Posición al final del nuevo grupo de hermanas.
    const nextOrder = await this.nextSortOrder(client, org.world_id, parentId)

    const { error } = await client
      .from('articles')
      .update({ org_parent_id: parentId, org_sort_order: nextOrder })
      .eq('id', orgId)
    if (error) throw new InternalServerErrorException(error.message)
  }

  /**
   * Reordena un conjunto de facciones hermanas. El frontend manda la lista
   * completa de ids en el orden deseado; cada una recibe `org_sort_order`
   * igual a su índice. Útil tanto para arrastrar-y-soltar como para
   * botones de subir/bajar.
   */
  async reorder(ids: string[], accessToken: string): Promise<void> {
    if (ids.length === 0) return
    const client = this.supabase.forUser(accessToken)

    // Comprobamos que todas existan y sean organizaciones del usuario (RLS
    // ya filtra mundos ajenos; basta con poder leerlas).
    const { data: rows, error } = await client
      .from('articles')
      .select('id, type')
      .in('id', ids)
    if (error) throw new InternalServerErrorException(error.message)
    if (!rows || rows.length !== ids.length) {
      throw new NotFoundException('one or more factions not found')
    }
    if (rows.some((r: { type: string }) => r.type !== 'organization')) {
      throw new BadRequestException('every id must be an organization')
    }

    for (let i = 0; i < ids.length; i++) {
      const { error: upErr } = await client
        .from('articles')
        .update({ org_sort_order: i })
        .eq('id', ids[i])
      if (upErr) throw new InternalServerErrorException(upErr.message)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async requireOrg(client: any, id: string): Promise<OrgRow> {
    const { data, error } = await client
      .from('articles')
      .select('id, world_id, type, org_parent_id')
      .eq('id', id)
      .single()
    if (error) throw new NotFoundException('faction not found')
    if (data.type !== 'organization') {
      throw new BadRequestException('article is not an organization')
    }
    return data as OrgRow
  }

  private async nextSortOrder(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: any,
    worldId: string,
    parentId: string | null,
  ): Promise<number> {
    let q = client
      .from('articles')
      .select('org_sort_order')
      .eq('world_id', worldId)
      .eq('type', 'organization')
      .order('org_sort_order', { ascending: false })
      .limit(1)
    q = parentId ? q.eq('org_parent_id', parentId) : q.is('org_parent_id', null)
    const { data, error } = await q
    if (error) throw new InternalServerErrorException(error.message)
    const top = data && data.length > 0 ? (data[0].org_sort_order as number) : -1
    return top + 1
  }

  /**
   * ¿`candidateAncestorId` es descendiente de `rootId`? Sube desde cada
   * facción del mundo siguiendo `org_parent_id`. Cargamos el mapa completo
   * de padres del mundo (un solo round-trip) y caminamos en memoria.
   */
  private async isDescendant(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: any,
    worldId: string,
    candidateId: string,
    rootId: string,
  ): Promise<boolean> {
    const { data, error } = await client
      .from('articles')
      .select('id, org_parent_id')
      .eq('world_id', worldId)
      .eq('type', 'organization')
    if (error) throw new InternalServerErrorException(error.message)

    const parentOf = new Map<string, string | null>()
    for (const r of (data ?? []) as { id: string; org_parent_id: string | null }[]) {
      parentOf.set(r.id, r.org_parent_id)
    }

    // Subimos desde candidate; si topamos con root, candidate es su descendiente.
    let cursor: string | null | undefined = candidateId
    const seen = new Set<string>()
    while (cursor) {
      if (cursor === rootId) return true
      if (seen.has(cursor)) break
      seen.add(cursor)
      cursor = parentOf.get(cursor) ?? null
    }
    return false
  }
}
