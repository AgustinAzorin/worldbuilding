import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '../common/supabase/supabase.service'

@Injectable()
export class FoldersService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(
    worldId: string,
    name: string,
    parentId: string | null | undefined,
    accessToken: string,
  ) {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('folders')
      .insert({ world_id: worldId, name, parent_id: parentId ?? null })
      .select('*')
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async update(
    folderId: string,
    name: string | undefined,
    parentId: string | null | undefined,
    accessToken: string,
  ) {
    const patch: Record<string, unknown> = {}
    if (name !== undefined) patch.name = name
    // explicitly allow null to move folder to root
    if (parentId !== undefined) patch.parent_id = parentId

    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('folders')
      .update(patch)
      .eq('id', folderId)
      .select('*')
      .single()

    if (error) throw new NotFoundException('Folder not found or access denied')
    return data
  }

  async remove(folderId: string, accessToken: string) {
    const { error } = await this.supabase
      .forUser(accessToken)
      .from('folders')
      .delete()
      .eq('id', folderId)

    if (error) throw new InternalServerErrorException(error.message)
  }

  async moveArticle(
    articleId: string,
    folderId: string | null,
    accessToken: string,
  ) {
    const { error } = await this.supabase
      .forUser(accessToken)
      .from('articles')
      .update({ folder_id: folderId })
      .eq('id', articleId)

    if (error) throw new InternalServerErrorException(error.message)
  }
}
