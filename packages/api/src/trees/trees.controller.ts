import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { TreesService } from './trees.service'
import { CreateTreeDto } from './dto/create-tree.dto'
import { UpdateTreeDto } from './dto/update-tree.dto'
import { CreateTreeEdgeDto } from './dto/create-tree-edge.dto'
import { AuthGuard } from '../common/auth/auth.guard'
import { CurrentUser } from '../common/auth/current-user.decorator'

interface UserCtx {
  user: { id: string }
  accessToken: string
}

@Controller('trees')
@UseGuards(AuthGuard)
export class TreesController {
  constructor(private readonly trees: TreesService) {}

  @Post()
  create(@Body() dto: CreateTreeDto, @CurrentUser() { accessToken }: UserCtx) {
    return this.trees.create(dto.worldId, dto.name, dto.description ?? null, accessToken)
  }

  @Delete('edges/:edgeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeEdge(
    @Param('edgeId') edgeId: string,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.trees.removeEdge(edgeId, accessToken)
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() { accessToken }: UserCtx) {
    return this.trees.getById(id, accessToken)
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTreeDto,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.trees.update(id, dto, accessToken)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() { accessToken }: UserCtx) {
    return this.trees.remove(id, accessToken)
  }

  @Post(':id/edges')
  addEdge(
    @Param('id') treeId: string,
    @Body() dto: CreateTreeEdgeDto,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.trees.addEdge(treeId, dto.parentId, dto.childId, accessToken)
  }
}
