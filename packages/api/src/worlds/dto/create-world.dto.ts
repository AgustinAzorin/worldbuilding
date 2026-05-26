import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class CreateWorldDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string
}
