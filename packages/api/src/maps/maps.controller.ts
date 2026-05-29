import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { MapsService } from './maps.service'
import { CreateMapDto } from './dto/create-map.dto'
import { CreatePinDto } from './dto/create-pin.dto'
import { AuthGuard } from '../common/auth/auth.guard'
import { CurrentUser } from '../common/auth/current-user.decorator'

interface UserCtx {
  user: { id: string }
  accessToken: string
}

@Controller('maps')
@UseGuards(AuthGuard)
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Post()
  create(
    @Body() dto: CreateMapDto,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.mapsService.create(dto, accessToken)
  }

  @Get()
  listByWorld(
    @Query('worldId') worldId: string,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.mapsService.listByWorld(worldId, accessToken)
  }

  @Get(':mapId')
  getWithPins(
    @Param('mapId') mapId: string,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.mapsService.getWithPins(mapId, accessToken)
  }

  @Post('pins')
  savePin(
    @Body() dto: CreatePinDto,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.mapsService.savePin(dto, accessToken)
  }

  @Delete('pins/:pinId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePin(
    @Param('pinId') pinId: string,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.mapsService.deletePin(pinId, accessToken)
  }
}
