import { Module } from '@nestjs/common'
import { SupabaseModule } from '../common/supabase/supabase.module'
import { TemplatesController } from './templates.controller'
import { TemplatesService } from './templates.service'

@Module({
  imports: [SupabaseModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
})
export class TemplatesModule {}
