import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

// 校验 Admin 登录后签发的 JWT（payload.type === 'admin'）。
// 与用户端 JwtAuthGuard 共用同一 ACCESS 密钥，仅靠 type 区分，互不越权。
@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const header = req.headers?.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    if (!token) throw new UnauthorizedException('未登录或登录已过期')

    try {
      const payload = this.jwt.verify(token)
      if (payload?.type !== 'admin') throw new Error('wrong admin token')
      req.admin = { adminId: payload.sub, username: payload.username }
      return true
    } catch {
      throw new UnauthorizedException('未登录或登录已过期')
    }
  }
}
