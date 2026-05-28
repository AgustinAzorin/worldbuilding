import { IsIn, IsOptional, IsUUID } from 'class-validator'

export class CreateTreeEdgeDto {
  @IsUUID()
  parentId!: string

  @IsUUID()
  childId!: string

  @IsOptional()
  @IsIn(['biological', 'adopted', 'bastard'])
  relationType?: 'biological' | 'adopted' | 'bastard'
}
