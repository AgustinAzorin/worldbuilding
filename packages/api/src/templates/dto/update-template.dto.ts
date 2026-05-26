import { IsArray, IsNotEmpty, IsString, Validate } from 'class-validator'
import {
  IsArticleModulesArrayConstraint,
  IsHeaderFieldsArrayConstraint,
} from '../../articles/dto/create-article.dto'
import type { ArticleModule, HeaderField } from '../../common/types'

export class UpdateTemplateDto {
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
