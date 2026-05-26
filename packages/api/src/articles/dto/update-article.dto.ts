import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Validate } from 'class-validator'
import type { ArticleMetadata, TipTapContent } from '../../common/types'
import { IsArticleMetadataConstraint } from './create-article.dto'

export class UpdateArticleDto {
  @IsUUID()
  worldId!: string

  @IsString()
  @IsNotEmpty()
  title!: string

  @IsObject()
  content!: TipTapContent

  @IsOptional()
  @IsObject()
  @Validate(IsArticleMetadataConstraint)
  metadata?: ArticleMetadata
}
