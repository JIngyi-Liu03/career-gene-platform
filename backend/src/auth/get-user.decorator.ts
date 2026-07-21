import { createParamDecorator, ExecutionContext } from '@nestjs/common'

// 从 request.user 取出当前登录用户 { userId, phone }。
export const GetUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest()
  return req.user
})
