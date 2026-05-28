import { IsOptional, IsUUID, ValidateIf } from 'class-validator'

export class SetParentDto {
  /** UUID de la facción madre, o null para volverla raíz. */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  parentId!: string | null
}
