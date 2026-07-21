import { Controller, Post, Body, Get, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt.guard'
import { GetUser } from './get-user.decorator'
import { SECURITY_QUESTIONS } from '../quiz/desc.data'
import type { RegisterDto, LoginDto, RecoverDto, RefreshDto } from './dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  // 前端拉取安全问题列表（避免前后端硬编码漂移）。
  @Get('security-questions')
  securityQuestions(): { questions: string[] } {
    return { questions: SECURITY_QUESTIONS }
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.service.register(dto)
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.service.login(dto)
  }

  @Post('recover')
  recover(@Body() dto: RecoverDto) {
    return this.service.recover(dto)
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.service.refresh(dto)
  }

  // 取当前登录用户信息（调试/前端初始化用）。
  @Get('me')
  async me(@GetUser() user: { userId: number; phone: string }) {
    if (!user) throw new UnauthorizedException()
    return { userId: user.userId, phone: user.phone }
  }
}
