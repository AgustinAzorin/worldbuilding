import { Module } from '@nestjs/common'
import { MapsController } from './maps.controller'
import { MapsService } from './maps.service'
import { SupabaseModule } from '../common/supabase/supabase.module'

@Module({
  imports: [SupabaseModule],
  controllers: [MapsController],
  providers: [MapsService],
})
export class MapsModule {}
