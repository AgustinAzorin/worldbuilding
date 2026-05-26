import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

export class UpdateFolderDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string

  // null → move to world root; UUID → move under that parent
  @IsUUID()
  @IsOptional()
  parentId?: string | null
}
