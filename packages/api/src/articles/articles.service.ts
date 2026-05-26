import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '../common/supabase/supabase.service'
import {
  mentionIdsFromModules,
  type ArticleModule,
  type HeaderField,
} from '../common/types'

@Injectable()
export class ArticlesService {
  constructor(private readonly supabase: SupabaseService) {}

  async search(worldId: string, query: string, accessToken: string) {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('articles')
      .select('id, title')
      .eq('world_id', worldId)
      .ilike('title', `%${query}%`)
      .order('title')
      .limit(10)

    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async getById(articleId: string, accessToken: string) {
    const client = this.supabase.forUser(accessToken)

    const { data: article, error } = await client
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single()

    if (error) throw new NotFoundException('Article not found')

    const [outResult, inResult] = await Promise.all([
      client
        .from('article_relations')
        .select('articles!article_relations_target_article_id_fkey(id, title)')
        .eq('source_article_id', articleId),
      client
        .from('article_relations')
        .select('articles!article_relations_source_article_id_fkey(id, title)')
        .eq('target_article_id', articleId),
    ])

    return {
      ...article,
      header_fields: (article.header_fields ?? []) as HeaderField[],
      modules:       (article.modules       ?? []) as ArticleModule[],
      outgoing: (outResult.data ?? []).flatMap(r => r.articles ?? []),
      incoming: (inResult.data  ?? []).flatMap(r => r.articles ?? []),
    }
  }

  async create(
    worldId: string,
    title: string,
    headerFields: HeaderField[],
    modules: ArticleModule[],
    accessToken: string,
  ) {
    const client = this.supabase.forUser(accessToken)

    const { data, error } = await client
      .from('articles')
      .insert({ world_id: worldId, title, header_fields: headerFields, modules })
      .select('id')
      .single()

    if (error) throw new InternalServerErrorException(error.message)

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

  async update(
    articleId: string,
    worldId: string,
    title: string,
    headerFields: HeaderField[],
    modules: ArticleModule[],
    accessToken: string,
  ) {
    const client = this.supabase.forUser(accessToken)

    const { error: updateError } = await client
      .from('articles')
      .update({ title, header_fields: headerFields, modules })
      .eq('id', articleId)
      .eq('world_id', worldId)

    if (updateError) throw new InternalServerErrorException(updateError.message)

    const targetIds = mentionIdsFromModules(modules, articleId)

    const { error: rpcError } = await client.rpc('sync_article_relations', {
      p_source_id: articleId,
      p_target_ids: targetIds,
    })

    if (rpcError) throw new InternalServerErrorException(rpcError.message)
  }
}
