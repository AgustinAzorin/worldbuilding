import {
  IsInt,
  Max,
  Min,
  ValidateIf,
} from 'class-validator'

export class UpdateRelationDiplomacyDto {
  /**
   * Eje diplomático ∈ [-100, 100], o `null` para borrar el score.
   * El servicio recorta el rango defensivamente además del validador.
   */
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(-100)
  @Max(100)
  diplomacyScore!: number | null
}
