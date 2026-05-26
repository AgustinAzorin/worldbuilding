import { Module } from '@nestjs/common'
import { SupabaseModule } from './common/supabase/supabase.module'
import { WorldsModule } from './worlds/worlds.module'
import { ArticlesModule } from './articles/articles.module'
import { FoldersModule } from './folders/folders.module'

@Module({
  imports: [SupabaseModule, WorldsModule, ArticlesModule, FoldersModule],
})
export class AppModule {}
