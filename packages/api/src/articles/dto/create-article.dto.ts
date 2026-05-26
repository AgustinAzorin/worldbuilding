import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'
import { isArticleMetadata, type ArticleMetadata, type TipTapContent } from '../../common/types'

@ValidatorConstraint({ name: 'IsArticleMetadata', async: false })
export class IsArticleMetadataConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return value === undefined || isArticleMetadata(value)
  }
  defaultMessage(): string {
    return 'metadata must be a flat object of string → string entries'
  }
}

export class CreateArticleDto {
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
