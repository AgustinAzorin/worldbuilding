import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator'

export class CreateSemanticRelationDto {
  @IsUUID()
  targetId!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string
}
