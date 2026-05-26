import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { WorldsService } from './worlds.service'
import { CreateWorldDto } from './dto/create-world.dto'
import { AuthGuard } from '../common/auth/auth.guard'
import { CurrentUser } from '../common/auth/current-user.decorator'

interface UserCtx {
  user: { id: string }
  accessToken: string
}

@Controller('worlds')
@UseGuards(AuthGuard)
export class WorldsController {
  constructor(private readonly worldsService: WorldsService) {}

  @Get()
  list(@CurrentUser() { accessToken }: UserCtx) {
    return this.worldsService.list(accessToken)
  }

  @Post()
  create(@Body() dto: CreateWorldDto, @CurrentUser() { user, accessToken }: UserCtx) {
    return this.worldsService.create(user.id, dto.title, accessToken)
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() { accessToken }: UserCtx) {
    return this.worldsService.getById(id, accessToken)
  }

  @Get(':id/articles')
  listArticles(@Param('id') worldId: string, @CurrentUser() { accessToken }: UserCtx) {
    return this.worldsService.listArticles(worldId, accessToken)
  }

  @Get(':id/folder-tree')
  getFolderTree(@Param('id') worldId: string, @CurrentUser() { accessToken }: UserCtx) {
    return this.worldsService.getFolderTree(worldId, accessToken)
  }

  @Get(':id/graph')
  getGraphData(@Param('id') worldId: string, @CurrentUser() { accessToken }: UserCtx) {
    return this.worldsService.getGraphData(worldId, accessToken)
  }
}
