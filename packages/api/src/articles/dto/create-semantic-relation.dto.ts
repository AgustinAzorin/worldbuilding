import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class CreateSemanticRelationDto {
  @IsUUID()
  targetId!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string

  @IsOptional()
  @IsInt()
  @Min(-100)
  @Max(100)
  diplomacyScore?: number | null
}
