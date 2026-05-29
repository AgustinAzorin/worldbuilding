import { IsString, IsUUID, IsNotEmpty } from 'class-validator'

export class CreateMapDto {
  @IsUUID()
  worldId!: string

  @IsString()
  @IsNotEmpty()
  title!: string

  @IsString()
  @IsNotEmpty()
  imageUrl!: string
}
