import { IsUUID } from 'class-validator'

export class CreateTreeEdgeDto {
  @IsUUID()
  parentId!: string

  @IsUUID()
  childId!: string
}
