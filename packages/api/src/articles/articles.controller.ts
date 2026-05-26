import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ArticlesService } from './articles.service'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { AuthGuard } from '../common/auth/auth.guard'
import { CurrentUser } from '../common/auth/current-user.decorator'

interface UserCtx {
  user: { id: string }
  accessToken: string
}

@Controller('articles')
@UseGuards(AuthGuard)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  /** Autocomplete de menciones — consumido por el editor TipTap */
  @Get('search')
  search(
    @Query('worldId') worldId: string,
    @Query('q') q = '',
    @CurrentUser() { accessToken }: UserCtx
  ) {
    return this.articlesService.search(worldId, q, accessToken)
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() { accessToken }: UserCtx) {
    return this.articlesService.getById(id, accessToken)
  }

  @Post()
  create(@Body() dto: CreateArticleDto, @CurrentUser() { accessToken }: UserCtx) {
    return this.articlesService.create(dto.worldId, dto.title, dto.content, accessToken)
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() { accessToken }: UserCtx
  ) {
    return this.articlesService.update(id, dto.worldId, dto.title, dto.content, accessToken)
  }
}
