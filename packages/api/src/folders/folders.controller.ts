import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { FoldersService } from './folders.service'
import { CreateFolderDto } from './dto/create-folder.dto'
import { UpdateFolderDto } from './dto/update-folder.dto'
import { AuthGuard } from '../common/auth/auth.guard'
import { CurrentUser } from '../common/auth/current-user.decorator'

interface UserCtx {
  user: { id: string }
  accessToken: string
}

@Controller('folders')
@UseGuards(AuthGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  create(@Body() dto: CreateFolderDto, @CurrentUser() { accessToken }: UserCtx) {
    return this.foldersService.create(dto.worldId, dto.name, dto.parentId, accessToken)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.foldersService.update(id, dto.name, dto.parentId, accessToken)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() { accessToken }: UserCtx) {
    return this.foldersService.remove(id, accessToken)
  }

  /** Move an article into a folder (or to root when folderId is null) */
  @Patch('articles/:articleId/move')
  moveArticle(
    @Param('articleId') articleId: string,
    @Body('folderId') folderId: string | null,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.foldersService.moveArticle(articleId, folderId, accessToken)
  }
}
