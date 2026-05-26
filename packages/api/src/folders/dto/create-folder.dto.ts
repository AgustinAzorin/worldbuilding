import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateFolderDto {
  @IsUUID()
  worldId!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsUUID()
  @IsOptional()
  parentId?: string | null
}
