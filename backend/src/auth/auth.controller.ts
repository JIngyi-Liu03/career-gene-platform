import { Controller, Post, Body, Get, UnauthorizedException } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt.guard'
import { GetUser } from './get-user.decorator'
import { SECURITY_QUESTIONS } from '../quiz/desc.data'
import type { RegisterDto, LoginDto, RecoverDto, RefreshDto, AuthTokens, SendSmsDto, SmsRegisterDto, SmsResetDto } from './dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  // 前端拉取安全问题列表（避免前后端硬编码漂移）。
  @Get('security-questions')
  securityQuestions(): { questions: string[] } {
    return { questions: SECURITY_QUESTIONS }
  }

  // 注册：每 IP 每分钟最多 5 次，防批量注册/爆破。
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.service.register(dto)
  }

  // 登录：每 IP 每分钟最多 5 次，防密码爆破。
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.service.login(dto)
  }

  // 找回密码：每 IP 每分钟最多 5 次。
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @Post('recover')
  recover(@Body() dto: RecoverDto) {
    return this.service.recover(dto)
  }

  // 刷新令牌：每 IP 每分钟最多 10 次（续期较频繁）。
  @Throttle({ global: { limit: 10, ttl: 60000 } })
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

  // 发送短信验证码（注册 / 重置密码场景）：每 IP 每分钟最多 5 次。
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @Post('sms/send')
  sendSms(@Body() dto: SendSmsDto) {
    return this.service.sendSms(dto)
  }

  // 短信验证码注册：校验验证码后创建用户。
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @Post('sms/register')
  registerWithSms(@Body() dto: SmsRegisterDto) {
    return this.service.registerWithSms(dto)
  }

  // 短信验证码重置密码：仅更新密码，保留测评历史。
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @Post('sms/reset-password')
  resetPasswordWithSms(@Body() dto: SmsResetDto) {
    return this.service.resetPasswordWithSms(dto)
  }
}
