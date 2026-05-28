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
  Query,
  UseGuards,
} from '@nestjs/common'
import { ArticlesService } from './articles.service'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { CreateSemanticRelationDto } from './dto/create-semantic-relation.dto'
import { UpdateRelationDiplomacyDto } from './dto/update-relation-diplomacy.dto'
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

  // ── Semantic relations CRUD (declared via UI) ────────────────────────────

  @Get(':id/relations')
  listSemanticRelations(
    @Param('id') articleId: string,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.articlesService.listSemanticRelations(articleId, accessToken)
  }

  @Post(':id/relations')
  createSemanticRelation(
    @Param('id') articleId: string,
    @Body() dto: CreateSemanticRelationDto,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.articlesService.createSemanticRelation(
      articleId,
      dto.targetId,
      dto.label,
      dto.diplomacyScore ?? null,
      accessToken,
    )
  }

  @Patch('relations/:relationId/diplomacy')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateRelationDiplomacy(
    @Param('relationId') relationId: string,
    @Body() dto: UpdateRelationDiplomacyDto,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.articlesService.updateSemanticRelationDiplomacy(
      relationId,
      dto.diplomacyScore,
      accessToken,
    )
  }

  @Delete('relations/:relationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSemanticRelation(
    @Param('relationId') relationId: string,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.articlesService.deleteSemanticRelation(relationId, accessToken)
  }

  @Get(':id')
  getById(
    @Param('id') id: string,
    @CurrentUser() { user, accessToken }: UserCtx,
  ) {
    return this.articlesService.getById(id, user.id, accessToken)
  }

  @Post()
  create(@Body() dto: CreateArticleDto, @CurrentUser() { accessToken }: UserCtx) {
    return this.articlesService.create(
      dto.worldId,
      dto.title,
      dto.headerFields,
      dto.modules,
      accessToken,
      {
        type:        dto.type,
        startYear:   dto.startYear,
        endYear:     dto.endYear,
        dateDisplay: dto.dateDisplay,
      },
    )
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() { accessToken }: UserCtx
  ) {
    return this.articlesService.update(
      id,
      dto.worldId,
      dto.title,
      dto.headerFields,
      dto.modules,
      accessToken,
      {
        type:        dto.type,
        startYear:   dto.startYear,
        endYear:     dto.endYear,
        dateDisplay: dto.dateDisplay,
      },
    )
  }
}
