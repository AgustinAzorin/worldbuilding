import { Module } from '@nestjs/common'
import { SupabaseModule } from './common/supabase/supabase.module'
import { WorldsModule } from './worlds/worlds.module'
import { ArticlesModule } from './articles/articles.module'
import { FoldersModule } from './folders/folders.module'
import { TemplatesModule } from './templates/templates.module'
import { TreesModule } from './trees/trees.module'
import { OrganizationsModule } from './organizations/organizations.module'
import { MapsModule } from './maps/maps.module'

@Module({
  imports: [
    SupabaseModule,
    WorldsModule,
    ArticlesModule,
    FoldersModule,
    TemplatesModule,
    TreesModule,
    OrganizationsModule,
    MapsModule,
  ],
})
export class AppModule {}
