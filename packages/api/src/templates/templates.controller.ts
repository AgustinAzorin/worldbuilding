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
import { TemplatesService } from './templates.service'
import { CreateTemplateDto } from './dto/create-template.dto'
import { UpdateTemplateDto } from './dto/update-template.dto'
import { CreateArticleFromTemplateDto } from './dto/create-article-from-template.dto'
import { AuthGuard } from '../common/auth/auth.guard'
import { CurrentUser } from '../common/auth/current-user.decorator'

interface UserCtx {
  user: { id: string }
  accessToken: string
}

@Controller('templates')
@UseGuards(AuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  list(@Query('worldId') worldId: string, @CurrentUser() { accessToken }: UserCtx) {
    return this.templatesService.listByWorld(worldId, accessToken)
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() { accessToken }: UserCtx) {
    return this.templatesService.getById(id, accessToken)
  }

  @Post()
  create(@Body() dto: CreateTemplateDto, @CurrentUser() { accessToken }: UserCtx) {
    return this.templatesService.create(
      dto.worldId,
      dto.name,
      dto.headerFields,
      dto.modules,
      accessToken,
    )
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.templatesService.update(
      id,
      dto.name,
      dto.headerFields,
      dto.modules,
      accessToken,
    )
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() { accessToken }: UserCtx) {
    return this.templatesService.remove(id, accessToken)
  }

  /**
   * Instancia un artículo desde una plantilla. Acepta `templateId` null
   * para crear un artículo vacío (atajo unificado del flow "Nuevo artículo").
   */
  @Post('instantiate')
  instantiate(
    @Body() dto: CreateArticleFromTemplateDto,
    @CurrentUser() { accessToken }: UserCtx,
  ) {
    return this.templatesService.createArticleFromTemplate(
      dto.worldId,
      dto.title,
      dto.templateId ?? null,
      accessToken,
    )
  }
}
