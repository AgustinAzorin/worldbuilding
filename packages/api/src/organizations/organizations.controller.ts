import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { OrganizationsService } from './organizations.service'
import { SetParentDto } from './dto/set-parent.dto'
import { ReorderDto } from './dto/reorder.dto'
import { UpdateMembershipDto } from './dto/update-membership.dto'
import { AuthGuard } from '../common/auth/auth.guard'
import { CurrentUser } from '../common/auth/current-user.decorator'

interface UserCtx {
  user: { id: string }
  accessToken: string
}

@Controller('organizations')
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  reorder(@Body() dto: ReorderDto, @CurrentUser() { accessToken }: UserCtx) {
    return this.organizations.reorder(dto.ids, accessToken)
  }

  @Patch(':id/parent')
  @HttpCode(HttpStatus.NO_CONTENT)
  setParent(
    @Param('id') id: string,
    @Body() dto: SetParentDto,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.organizations.setParent(id, dto.parentId ?? null, accessToken)
  }

  /** Roster de la organización con su jerarquía interna de miembros. */
  @Get(':id/members')
  listMembers(@Param('id') id: string, @CurrentUser() { accessToken }: UserCtx) {
    return this.organizations.listMembers(id, accessToken)
  }

  /** Edita cargo, nivel y/o superior de una membresía. */
  @Patch('memberships/:relationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateMembership(
    @Param('relationId') relationId: string,
    @Body() dto: UpdateMembershipDto,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.organizations.updateMembership(
      relationId,
      {
        rank: dto.rank,
        rankLevel: dto.rankLevel,
        reportsToMemberId: dto.reportsToMemberId,
      },
      accessToken,
    )
  }
}
