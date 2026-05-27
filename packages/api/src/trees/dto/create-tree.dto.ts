import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

export class CreateTreeDto {
  @IsUUID()
  worldId!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null
}
