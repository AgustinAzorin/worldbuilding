import { IsIn, IsOptional, IsUUID } from 'class-validator'

export class CreateTreePartnershipDto {
  @IsUUID()
  memberAId!: string

  @IsUUID()
  memberBId!: string

  @IsOptional()
  @IsIn(['spouse', 'partner', 'betrothed'])
  relationType?: 'spouse' | 'partner' | 'betrothed'
}
