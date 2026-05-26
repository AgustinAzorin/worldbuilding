import { IsNotEmpty, IsObject, IsString, IsUUID } from 'class-validator'
import type { TipTapContent } from '../../common/types'

export class CreateArticleDto {
  @IsUUID()
  worldId!: string

  @IsString()
  @IsNotEmpty()
  title!: string

  @IsObject()
  content!: TipTapContent
}
