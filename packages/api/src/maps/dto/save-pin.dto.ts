import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import { PIN_TYPES, type PinType } from '../../common/types'

export class SavePinDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string

  /** Artículo enlazado (opcional): NPC, ítem, evento, facción, ubicación. */
  @IsOptional()
  @IsUUID()
  articleId?: string | null

  /** Coordenada relativa horizontal dentro de la imagen (0..1). */
  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number

  /** Coordenada relativa vertical dentro de la imagen (0..1). */
  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number

  @IsIn(PIN_TYPES as readonly string[])
  pinType!: PinType
}
