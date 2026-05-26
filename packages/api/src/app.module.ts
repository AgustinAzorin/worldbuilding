import { Module } from '@nestjs/common'
import { SupabaseModule } from './common/supabase/supabase.module'
import { WorldsModule } from './worlds/worlds.module'
import { ArticlesModule } from './articles/articles.module'

@Module({
  imports: [SupabaseModule, WorldsModule, ArticlesModule],
})
export class AppModule {}
