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
}
