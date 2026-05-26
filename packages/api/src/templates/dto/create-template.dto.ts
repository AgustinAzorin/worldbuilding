import { IsArray, IsNotEmpty, IsString, IsUUID, Validate } from 'class-validator'
import {
  IsArticleModulesArrayConstraint,
  IsHeaderFieldsArrayConstraint,
} from '../../articles/dto/create-article.dto'
import type { ArticleModule, HeaderField } from '../../common/types'

export class CreateTemplateDto {
  @IsUUID()
  worldId!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsArray()
  @Validate(IsHeaderFieldsArrayConstraint)
  headerFields!: HeaderField[]

  @IsArray()
  @Validate(IsArticleModulesArrayConstraint)
  modules!: ArticleModule[]
}
