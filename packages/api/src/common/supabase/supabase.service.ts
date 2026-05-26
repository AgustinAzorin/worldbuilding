import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseService {
  /**
   * Crea un cliente Supabase autenticado con el JWT del usuario.
   * Supabase verifica el token y aplica RLS basado en auth.uid().
   * Se crea uno por request, no se reutiliza.
   */
  forUser(accessToken: string): SupabaseClient {
    return createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      }
    )
  }
}
