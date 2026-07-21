import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

// 校验 Authorization: Bearer <token> 或 X-Token 头里的 access token。
// 成功后把 { userId, phone } 挂到 request.user，供后续 handler 使用。
// 使用 AuthModule 注入的默认密钥（ACCESS 密钥）校验，不再直接依赖常量文件。
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const header = req.headers?.authorization || ''
    let token = ''
    if (header.startsWith('Bearer ')) token = header.slice(7).trim()
    else if (req.headers?.['x-token']) token = req.headers['x-token']
    else if (req.query?.token) token = req.query.token
    if (!token) throw new UnauthorizedException('未登录或登录已过期')

    try {
      const payload = this.jwt.verify(token)
      if (payload?.type !== 'access') throw new Error('wrong token type')
      req.user = { userId: payload.sub, phone: payload.phone }
      return true
    } catch {
      throw new UnauthorizedException('未登录或登录已过期')
    }
  }
}
