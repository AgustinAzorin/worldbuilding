import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '../common/supabase/supabase.service'
import type { CreateMapDto } from './dto/create-map.dto'
import type { CreatePinDto } from './dto/create-pin.dto'

@Injectable()
export class MapsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateMapDto, accessToken: string) {
    const client = this.supabase.forUser(accessToken)

    // Verificar que el mundo pertenece al usuario (RLS lo aplica también).
    const { data: world, error: worldErr } = await client
      .from('worlds')
      .select('id')
      .eq('id', dto.worldId)
      .single()

    if (worldErr || !world) throw new NotFoundException('World not found')

    const { data, error } = await client
      .from('maps')
      .insert({
        world_id:  dto.worldId,
        title:     dto.title,
        image_url: dto.imageUrl,
      })
      .select('id, world_id, title, image_url, created_at')
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async listByWorld(worldId: string, accessToken: string) {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('maps')
      .select('id, world_id, title, image_url, created_at')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false })

    if (error) throw new InternalServerErrorException(error.message)
    return data ?? []
  }

  async getWithPins(mapId: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken)

    const { data: map, error: mapErr } = await client
      .from('maps')
      .select('id, world_id, title, image_url, created_at')
      .eq('id', mapId)
      .single()

    if (mapErr || !map) throw new NotFoundException('Map not found')

    const { data: pins, error: pinsErr } = await client
      .from('map_pins')
      .select(`
        id, map_id, article_id, title, x, y, pin_type, created_at,
        article:articles(id, title, type)
      `)
      .eq('map_id', mapId)
      .order('created_at', { ascending: true })

    if (pinsErr) throw new InternalServerErrorException(pinsErr.message)

    return { ...map, pins: pins ?? [] }
  }

  async savePin(dto: CreatePinDto, accessToken: string) {
    const client = this.supabase.forUser(accessToken)

    // Confirmar que el mapa le pertenece al usuario (RLS ya lo hace,
    // pero hacemos un check explícito para devolver 404 claro).
    const { data: map, error: mapErr } = await client
      .from('maps')
      .select('id')
      .eq('id', dto.mapId)
      .single()

    if (mapErr || !map) throw new NotFoundException('Map not found')

    const { data, error } = await client
      .from('map_pins')
      .insert({
        map_id:     dto.mapId,
        article_id: dto.articleId ?? null,
        title:      dto.title,
        x:          dto.x,
        y:          dto.y,
        pin_type:   dto.pinType,
      })
      .select('id, map_id, article_id, title, x, y, pin_type, created_at')
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async deletePin(pinId: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken)

    const { data, error } = await client
      .from('map_pins')
      .delete()
      .eq('id', pinId)
      .select('id')

    if (error) throw new InternalServerErrorException(error.message)
    if (!data || data.length === 0) throw new NotFoundException('Pin not found')
  }
}
