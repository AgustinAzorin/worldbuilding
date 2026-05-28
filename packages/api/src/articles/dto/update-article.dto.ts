import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Validate,
} from 'class-validator'
import type { ArticleModule, ArticleType, HeaderField } from '../../common/types'
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

  @IsOptional()
  @IsIn(['document', 'event', 'organization'])
  type?: ArticleType

  @IsOptional()
  @IsInt()
  startYear?: number | null

  @IsOptional()
  @IsInt()
  endYear?: number | null

  @IsOptional()
  @IsString()
  dateDisplay?: string | null
}
