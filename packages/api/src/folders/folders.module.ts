import { Module } from '@nestjs/common'
import { SupabaseModule } from '../common/supabase/supabase.module'
import { FoldersController } from './folders.controller'
import { FoldersService } from './folders.service'

@Module({
  imports: [SupabaseModule],
  controllers: [FoldersController],
  providers: [FoldersService],
})
export class FoldersModule {}
