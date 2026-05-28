import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'
import {
  isArticleModulesArray,
  isHeaderFieldsArray,
  type ArticleModule,
  type ArticleType,
  type HeaderField,
} from '../../common/types'

@ValidatorConstraint({ name: 'IsHeaderFieldsArray', async: false })
export class IsHeaderFieldsArrayConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean { return isHeaderFieldsArray(value) }
  defaultMessage(): string {
    return 'header_fields must be an ordered array of { id, label, value, type: text|number }'
  }
}

@ValidatorConstraint({ name: 'IsArticleModulesArray', async: false })
export class IsArticleModulesArrayConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean { return isArticleModulesArray(value) }
  defaultMessage(): string {
    return 'modules must be an ordered array of typed module objects'
  }
}

export class CreateArticleDto {
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
