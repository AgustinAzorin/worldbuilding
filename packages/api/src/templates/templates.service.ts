import { randomUUID } from 'crypto'
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '../common/supabase/supabase.service'
import {
  isArticleModulesArray,
  isHeaderFieldsArray,
  mentionIdsFromModules,
  type ArticleModule,
  type HeaderField,
} from '../common/types'

@Injectable()
export class TemplatesService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(
    worldId: string,
    name: string,
    headerFields: HeaderField[],
    modules: ArticleModule[],
    accessToken: string,
  ) {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('article_templates')
      .insert({
        world_id: worldId,
        name,
        default_header_fields: headerFields,
        default_modules: modules,
      })
      .select('id, world_id, name, default_header_fields, default_modules, created_at')
      .single()

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async listByWorld(worldId: string, accessToken: string) {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('article_templates')
      .select('id, name, created_at')
      .eq('world_id', worldId)
      .order('name')

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async getById(templateId: string, accessToken: string) {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('article_templates')
      .select('id, world_id, name, default_header_fields, default_modules, created_at')
      .eq('id', templateId)
      .single()

    if (error) throw new NotFoundException('Template not found')
    return data
  }

  async update(
    templateId: string,
    name: string,
    headerFields: HeaderField[],
    modules: ArticleModule[],
    accessToken: string,
  ) {
    const { error } = await this.supabase
      .forUser(accessToken)
      .from('article_templates')
      .update({
        name,
        default_header_fields: headerFields,
        default_modules: modules,
      })
      .eq('id', templateId)

    if (error) throw new InternalServerErrorException(error.message)
  }

  async remove(templateId: string, accessToken: string) {
    const { error } = await this.supabase
      .forUser(accessToken)
      .from('article_templates')
      .delete()
      .eq('id', templateId)

    if (error) throw new InternalServerErrorException(error.message)
  }

  /**
   * Instancia un artículo nuevo a partir de una plantilla (o vacío si
   * `templateId` es null). Cada campo del header y cada módulo recibe un
   * UUID fresco, evitando colisiones de `key` en React entre artículos que
   * comparten preset.
   */
  async createArticleFromTemplate(
    worldId: string,
    title: string,
    templateId: string | null,
    accessToken: string,
  ) {
    const client = this.supabase.forUser(accessToken)

    let headerFields: HeaderField[] = []
    let modules: ArticleModule[] = []

    if (templateId) {
      const { data: template, error } = await client
        .from('article_templates')
        .select('world_id, default_header_fields, default_modules')
        .eq('id', templateId)
        .single()

      if (error || !template) throw new NotFoundException('Template not found')
      if (template.world_id !== worldId) {
        throw new NotFoundException('Template does not belong to this world')
      }

      const rawHeaders = template.default_header_fields
      const rawModules = template.default_modules
      if (!isHeaderFieldsArray(rawHeaders) || !isArticleModulesArray(rawModules)) {
        throw new InternalServerErrorException('Template stored with invalid shape')
      }

      headerFields = rawHeaders.map(f => ({ ...f, id: randomUUID() }))
      modules      = rawModules.map(m => ({ ...m, id: randomUUID() }) as ArticleModule)
    }

    const { data, error } = await client
      .from('articles')
      .insert({
        world_id: worldId,
        title,
        header_fields: headerFields,
        modules,
      })
      .select('id')
      .single()

    if (error) throw new InternalServerErrorException(error.message)

    // Re-sincronizar relaciones por menciones (poco probable en un template,
    // pero válido si el preset contiene rich-text con menciones).
    const targetIds = mentionIdsFromModules(modules)
    if (targetIds.length > 0) {
      await client.from('article_relations').insert(
        targetIds.map(targetId => ({
          source_article_id: data.id,
          target_article_id: targetId,
        })),
      )
    }

    return data
  }
}
