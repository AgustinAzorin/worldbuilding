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
import { SavePinDto } from './dto/save-pin.dto'
import { AuthGuard } from '../common/auth/auth.guard'
import { CurrentUser } from '../common/auth/current-user.decorator'

interface UserCtx {
  user: { id: string }
  accessToken: string
}

@Controller('maps')
@UseGuards(AuthGuard)
export class MapsController {
  constructor(private readonly maps: MapsService) {}

  /** Lista los mapas de un mundo. GET /maps?worldId=… */
  @Get()
  listByWorld(
    @Query('worldId') worldId: string,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.maps.listByWorld(worldId, accessToken)
  }

  @Post()
  create(@Body() dto: CreateMapDto, @CurrentUser() { accessToken }: UserCtx) {
    return this.maps.create(dto.worldId, dto.title, dto.imageUrl, accessToken)
  }

  /** Borra un pin. Declarado antes de ':id' para no colisionar con la ruta. */
  @Delete('pins/:pinId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePin(
    @Param('pinId') pinId: string,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.maps.deletePin(pinId, accessToken)
  }

  /** Un mapa específico junto con todos sus pines (JOIN al artículo). */
  @Get(':id')
  getWithPins(@Param('id') id: string, @CurrentUser() { accessToken }: UserCtx) {
    return this.maps.getWithPins(id, accessToken)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() { accessToken }: UserCtx) {
    return this.maps.remove(id, accessToken)
  }

  @Post(':id/pins')
  savePin(
    @Param('id') mapId: string,
    @Body() dto: SavePinDto,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.maps.savePin(
      mapId,
      {
        title: dto.title,
        articleId: dto.articleId ?? null,
        x: dto.x,
        y: dto.y,
        pinType: dto.pinType,
      },
      accessToken,
    )
  }
}
