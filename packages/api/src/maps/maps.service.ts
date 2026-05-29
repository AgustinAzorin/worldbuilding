import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '../common/supabase/supabase.service'
import type { PinType } from '../common/types'

export interface MapSummary {
  id: string
  world_id: string
  title: string
  image_url: string
  created_at: string
  pin_count: number
}

export interface MapPin {
  id: string
  map_id: string
  article_id: string | null
  title: string
  x: number
  y: number
  pin_type: PinType
  created_at: string
  /** Datos del artículo enlazado (JOIN). `null` si el pin es sólo etiqueta. */
  article: { id: string; title: string; type: string } | null
}

export interface MapWithPins {
  id: string
  world_id: string
  title: string
  image_url: string
  created_at: string
  pins: MapPin[]
}

export interface SavePinInput {
  title: string
  articleId?: string | null
  x: number
  y: number
  pinType: PinType
}

// Fila cruda devuelta por Supabase al embeber el artículo enlazado.
interface PinRow {
  id: string
  map_id: string
  article_id: string | null
  title: string
  x: number
  y: number
  pin_type: PinType
  created_at: string
  article:
    | { id: string; title: string; type: string }
    | { id: string; title: string; type: string }[]
    | null
}

function pickFirst<T>(v: T | T[] | null): T | null {
  if (v === null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

@Injectable()
export class MapsService {
  constructor(private readonly supabase: SupabaseService) {}

  /** Lista compacta de mapas de un mundo, con conteo de pines. */
  async listByWorld(worldId: string, accessToken: string): Promise<MapSummary[]> {
    const client = this.supabase.forUser(accessToken)

    const { data: maps, error } = await client
      .from('maps')
      .select('id, world_id, title, image_url, created_at')
      .eq('world_id', worldId)
      .order('created_at', { ascending: true })

    if (error) throw new InternalServerErrorException(error.message)
    if (!maps || maps.length === 0) return []

    const mapIds = maps.map(m => m.id as string)
    const { data: pins, error: pinsErr } = await client
      .from('map_pins')
      .select('map_id')
      .in('map_id', mapIds)

    if (pinsErr) throw new InternalServerErrorException(pinsErr.message)

    const counts = new Map<string, number>()
    for (const p of pins ?? []) {
      const mid = p.map_id as string
      counts.set(mid, (counts.get(mid) ?? 0) + 1)
    }

    return maps.map(m => ({
      id: m.id as string,
      world_id: m.world_id as string,
      title: m.title as string,
      image_url: m.image_url as string,
      created_at: m.created_at as string,
      pin_count: counts.get(m.id as string) ?? 0,
    }))
  }

  /** Un mapa + todos sus pines, con el artículo enlazado embebido (JOIN). */
  async getWithPins(mapId: string, accessToken: string): Promise<MapWithPins> {
    const client = this.supabase.forUser(accessToken)

    const { data: map, error } = await client
      .from('maps')
      .select('id, world_id, title, image_url, created_at')
      .eq('id', mapId)
      .single()

    if (error) throw new NotFoundException('Map not found')

    const { data: pins, error: pinsErr } = await client
      .from('map_pins')
      .select(
        'id, map_id, article_id, title, x, y, pin_type, created_at, ' +
          'article:articles!map_pins_article_id_fkey(id, title, type)',
      )
      .eq('map_id', mapId)
      .order('created_at', { ascending: true })

    if (pinsErr) throw new InternalServerErrorException(pinsErr.message)

    return {
      id: map.id as string,
      world_id: map.world_id as string,
      title: map.title as string,
      image_url: map.image_url as string,
      created_at: map.created_at as string,
      pins: ((pins ?? []) as unknown as PinRow[]).map(p => ({
        id: p.id,
        map_id: p.map_id,
        article_id: p.article_id,
        title: p.title,
        x: p.x,
        y: p.y,
        pin_type: p.pin_type,
        created_at: p.created_at,
        article: pickFirst(p.article),
      })),
    }
  }

  async create(
    worldId: string,
    title: string,
    imageUrl: string,
    accessToken: string,
  ): Promise<MapSummary> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('maps')
      .insert({
        world_id: worldId,
        title: title.trim(),
        image_url: imageUrl,
      })
      .select('id, world_id, title, image_url, created_at')
      .single()

    if (error) throw new InternalServerErrorException(error.message)

    return {
      id: data.id as string,
      world_id: data.world_id as string,
      title: data.title as string,
      image_url: data.image_url as string,
      created_at: data.created_at as string,
      pin_count: 0,
    }
  }

  async remove(mapId: string, accessToken: string): Promise<void> {
    const client = this.supabase.forUser(accessToken)
    const { data, error } = await client
      .from('maps')
      .delete()
      .eq('id', mapId)
      .select('id')

    if (error) throw new InternalServerErrorException(error.message)
    if (!data || data.length === 0) {
      throw new NotFoundException('Map not found')
    }
  }

  // ── Pins ──────────────────────────────────────────────────────────────────

  async savePin(
    mapId: string,
    input: SavePinInput,
    accessToken: string,
  ): Promise<MapPin> {
    const client = this.supabase.forUser(accessToken)

    // Verificamos que el mapa exista y sea accesible (RLS) y obtenemos su
    // mundo para validar que un artículo enlazado pertenezca al mismo mundo.
    const { data: map, error: mapErr } = await client
      .from('maps')
      .select('id, world_id')
      .eq('id', mapId)
      .single()
    if (mapErr) throw new NotFoundException('Map not found')

    const articleId = input.articleId ?? null
    if (articleId) {
      const { data: art, error: artErr } = await client
        .from('articles')
        .select('id, world_id')
        .eq('id', articleId)
        .single()
      if (artErr) throw new NotFoundException('Linked article not found')
      if (art.world_id !== map.world_id) {
        throw new ForbiddenException('Article must belong to the same world as the map')
      }
    }

    const { data: inserted, error: insErr } = await client
      .from('map_pins')
      .insert({
        map_id: mapId,
        article_id: articleId,
        title: input.title.trim(),
        x: input.x,
        y: input.y,
        pin_type: input.pinType,
      })
      .select(
        'id, map_id, article_id, title, x, y, pin_type, created_at, ' +
          'article:articles!map_pins_article_id_fkey(id, title, type)',
      )
      .single()

    if (insErr) throw new InternalServerErrorException(insErr.message)

    const row = inserted as unknown as PinRow
    return {
      id: row.id,
      map_id: row.map_id,
      article_id: row.article_id,
      title: row.title,
      x: row.x,
      y: row.y,
      pin_type: row.pin_type,
      created_at: row.created_at,
      article: pickFirst(row.article),
    }
  }

  async deletePin(pinId: string, accessToken: string): Promise<void> {
    const client = this.supabase.forUser(accessToken)
    const { data, error } = await client
      .from('map_pins')
      .delete()
      .eq('id', pinId)
      .select('id')

    if (error) throw new InternalServerErrorException(error.message)
    if (!data || data.length === 0) {
      throw new NotFoundException('Pin not found')
    }
  }
}
