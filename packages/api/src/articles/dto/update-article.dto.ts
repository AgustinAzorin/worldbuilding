import { IsArray, IsNotEmpty, IsString, IsUUID, Validate } from 'class-validator'
import type { ArticleModule, HeaderField } from '../../common/types'
import {
  IsArticleModulesArrayConstraint,
  IsHeaderFieldsArrayConstraint,
} from './create-article.dto'

export class UpdateArticleDto {
  @IsUUID()
  worldId!: string

  @IsString()
  @IsNotEmpty()
  title!: string

  @IsArray()
  @Validate(IsHeaderFieldsArrayConstraint)
  headerFields!: HeaderField[]

  @IsArray()
  @Validate(IsArticleModulesArrayConstraint)
  modules!: ArticleModule[]
}
