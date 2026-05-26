import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'
import type { Request } from 'express'

export interface AuthRequest extends Request {
  user: { id: string; email?: string }
  accessToken: string
}

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>()
    const auth = req.headers.authorization

    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token')
    }

    const token = auth.slice(7)

    // Verificar el JWT contra Supabase Auth
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired token')
    }

    req.user = { id: user.id, email: user.email }
    req.accessToken = token
    return true
  }
}
