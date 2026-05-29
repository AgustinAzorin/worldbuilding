import { IsString, IsUUID, IsNumber, IsOptional, IsNotEmpty, IsIn } from 'class-validator'

export const PIN_TYPES = ['npc', 'item', 'event', 'faction', 'location'] as const
export type PinType = typeof PIN_TYPES[number]

export class CreatePinDto {
  @IsUUID()
  mapId!: string

  @IsUUID()
  @IsOptional()
  articleId?: string | null

  @IsString()
  @IsNotEmpty()
  title!: string

  @IsNumber()
  x!: number

  @IsNumber()
  y!: number

  @IsString()
  @IsIn(PIN_TYPES)
  pinType!: PinType
}
