import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { AuthRequest } from './auth.guard'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<AuthRequest>()
    return { user: req.user, accessToken: req.accessToken }
  }
)
