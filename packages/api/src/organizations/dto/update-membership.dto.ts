import { IsInt, IsOptional, IsString, IsUUID, Min, ValidateIf } from 'class-validator'

/**
 * Parche de la jerarquía interna de una membresía. Todos los campos son
 * opcionales; sólo se aplican los presentes en el cuerpo.
 */
export class UpdateMembershipDto {
  /** Cargo / título del miembro. Cadena vacía o null lo limpia. */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  rank?: string | null

  /** Nivel jerárquico (menor = más alto). */
  @IsOptional()
  @IsInt()
  @Min(0)
  rankLevel?: number

  /** UUID del miembro superior, o null para dejarlo en la cima. */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  reportsToMemberId?: string | null
}
