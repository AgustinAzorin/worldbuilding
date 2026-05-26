import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateArticleFromTemplateDto {
  @IsUUID()
  worldId!: string

  @IsString()
  @IsNotEmpty()
  title!: string

  @IsUUID()
  @IsOptional()
  templateId?: string | null
}
