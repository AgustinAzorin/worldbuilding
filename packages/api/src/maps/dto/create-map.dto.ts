import { IsNotEmpty, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator'

export class CreateMapDto {
  @IsUUID()
  worldId!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string

  /**
   * URL pública de la imagen, ya subida al bucket `map-images` desde el
   * cliente (mismo flujo que las imágenes de artículos). El servidor sólo
   * persiste el registro.
   */
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  imageUrl!: string
}
