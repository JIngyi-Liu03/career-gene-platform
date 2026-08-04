import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { SECURITY_QUESTIONS } from '../quiz/desc.data'
import { partOrder, partStart, questions } from '../quiz/bank'
import { ACCESS_TTL, REFRESH_TTL, DEV_ACCESS_SECRET, DEV_REFRESH_SECRET } from './jwt.constants'
import type { RegisterDto, LoginDto, RecoverDto, RefreshDto, AuthTokens, SendSmsDto, SmsRegisterDto, SmsResetDto } from './dto'
import { SmsService } from './sms.service'

function isPhone(p: string): boolean {
  return /^1\d{10}$/.test(p || '')
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
  ) {}

  private issueTokens(userId: number, phone: string): AuthTokens {
    const accessSecret = this.config.get<string>('ACCESS_JWT_SECRET') ?? DEV_ACCESS_SECRET
    const refreshSecret = this.config.get<string>('REFRESH_JWT_SECRET') ?? DEV_REFRESH_SECRET
    const accessToken = this.jwt.sign(
      { sub: userId, phone, type: 'access' },
      { secret: accessSecret, expiresIn: ACCESS_TTL },
    )
    const refreshToken = this.jwt.sign(
      { sub: userId, phone, type: 'refresh' },
      { secret: refreshSecret, expiresIn: REFRESH_TTL },
    )
    return { accessToken, refreshToken }
  }

  // 计算某用户最新测评各部分的完成状态（true=已完成）。
  async computeDoneParts(userId: number): Promise<boolean[]> {
    const assessment = await this.prisma.assessment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { answers: true },
    })
    const done: boolean[] = partOrder.map(() => false)
    if (!assessment) return done
    const answered = new Set(assessment.answers.map((a) => a.questionIndex))
    partOrder.forEach((_, p) => {
      const start = partStart[p]
      const end = p < partOrder.length - 1 ? partStart[p + 1] : questions.length
      let all = true
      for (let i = start; i < end; i++) if (!answered.has(i)) { all = false; break }
      done[p] = all
    })
    return done
  }

  async register(dto: RegisterDto): Promise<AuthTokens & { doneParts: boolean[] }> {
    const phone = (dto.phone || '').trim()
    const name = (dto.name || '').trim()
    if (!isPhone(phone)) throw new BadRequestException('手机号格式有误')
    if (!name) throw new BadRequestException('请填写姓名')
    if (!dto.password || dto.password.length < 6) throw new BadRequestException('密码至少 6 位')
    if (!SECURITY_QUESTIONS.includes(dto.securityQuestion)) throw new BadRequestException('安全问题无效')
    if (!dto.securityAnswer || !dto.securityAnswer.trim()) throw new BadRequestException('请填写安全问题答案')

    const existing = await this.prisma.user.findUnique({ where: { phone } })
    if (existing) throw new BadRequestException('该手机号已注册，请直接登录')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const securityAnswerHash = await bcrypt.hash(dto.securityAnswer.trim(), 10)
    const company = (dto.company || '').trim()

    const user = await this.prisma.user.create({
      data: { phone, name, company, passwordHash, securityQuestion: dto.securityQuestion, securityAnswerHash },
    })
    const tokens = this.issueTokens(user.id, user.phone)
    return { ...tokens, doneParts: await this.computeDoneParts(user.id) }
  }

  async login(dto: LoginDto): Promise<AuthTokens & { name: string; doneParts: boolean[] }> {
    const phone = (dto.phone || '').trim()
    if (!isPhone(phone)) throw new BadRequestException('手机号格式有误')
    const user = await this.prisma.user.findUnique({ where: { phone } })
    if (!user) throw new UnauthorizedException('账号不存在，请先注册')
    const ok = await bcrypt.compare(dto.password || '', user.passwordHash)
    if (!ok) throw new UnauthorizedException('密码错误')
    const tokens = this.issueTokens(user.id, user.phone)
    return { ...tokens, name: user.name, doneParts: await this.computeDoneParts(user.id) }
  }

  async recover(dto: RecoverDto): Promise<{ ok: true }> {
    const phone = (dto.phone || '').trim()
    const name = (dto.name || '').trim()
    if (!isPhone(phone)) throw new BadRequestException('手机号格式有误')
    if (!dto.newPassword || dto.newPassword.length < 6) throw new BadRequestException('新密码至少 6 位')
    if (!dto.securityAnswer || !dto.securityAnswer.trim()) throw new BadRequestException('请填写安全问题答案')

    if (!dto.securityQuestion || !dto.securityQuestion.trim()) throw new BadRequestException('请选择安全问题')
    const user = await this.prisma.user.findUnique({ where: { phone } })
    if (!user) throw new NotFoundException('账号不存在')
    if ((user.name || '').trim() !== name) throw new BadRequestException('姓名与注册时不一致')
    if ((user.securityQuestion || '').trim() !== dto.securityQuestion.trim()) throw new BadRequestException('安全问题与注册时不一致')
    const ok = await bcrypt.compare(dto.securityAnswer.trim(), user.securityAnswerHash)
    if (!ok) throw new BadRequestException('安全问题答案不正确')

    const passwordHash = await bcrypt.hash(dto.newPassword, 10)
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
    return { ok: true }
  }

  // —— 短信验证码相关（注册 / 重置密码） ——

  // 发送验证码：按场景校验手机号是否已注册，并做 60s 限频。
  async sendSms(dto: SendSmsDto): Promise<{ ok: true; devCode?: string }> {
    const phone = (dto.phone || '').trim()
    const scene = dto.scene
    if (!isPhone(phone)) throw new BadRequestException('手机号格式有误')
    if (scene !== 'register' && scene !== 'reset') throw new BadRequestException('验证码场景无效')

    const existing = await this.prisma.user.findUnique({ where: { phone } })
    if (scene === 'register' && existing) throw new BadRequestException('该手机号已注册，请直接登录')
    if (scene === 'reset' && !existing) throw new BadRequestException('该手机号尚未注册')

    if (!this.sms.canSend(phone)) throw new BadRequestException('验证码发送过于频繁，请 60 秒后再试')

    const code = this.sms.create(phone, scene)
    const sent = await this.sms.send(phone, code)
    const isProd = (this.config.get<string>('NODE_ENV') || '') === 'production'
    return { ok: true, ...(sent.dev && !isProd ? { devCode: code } : {}) }
  }

  // 短信验证码注册：校验验证码 → 创建用户（username=手机号，role=user 的等价实现）。
  async registerWithSms(dto: SmsRegisterDto): Promise<AuthTokens & { doneParts: boolean[] }> {
    const phone = (dto.phone || '').trim()
    const name = (dto.name || '').trim()
    if (!isPhone(phone)) throw new BadRequestException('手机号格式有误')
    if (!name) throw new BadRequestException('请填写姓名')
    if (!dto.code) throw new BadRequestException('请填写验证码')
    if (!dto.password || dto.password.length < 6) throw new BadRequestException('密码至少 6 位')

    const existing = await this.prisma.user.findUnique({ where: { phone } })
    if (existing) throw new BadRequestException('该手机号已注册，请直接登录')

    const consume = this.sms.consume(phone, dto.code)
    if (!consume.ok) throw new BadRequestException(consume.error)

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const company = (dto.company || '').trim()
    const user = await this.prisma.user.create({
      data: { phone, name, company, passwordHash, securityQuestion: '', securityAnswerHash: '' },
    })
    const tokens = this.issueTokens(user.id, user.phone)
    return { ...tokens, doneParts: await this.computeDoneParts(user.id) }
  }

  // 短信验证码重置密码：仅更新 password_hash，保留全部测评历史数据。
  async resetPasswordWithSms(dto: SmsResetDto): Promise<{ ok: true }> {
    const phone = (dto.phone || '').trim()
    if (!isPhone(phone)) throw new BadRequestException('手机号格式有误')
    if (!dto.code) throw new BadRequestException('请填写验证码')
    if (!dto.newPassword || dto.newPassword.length < 6) throw new BadRequestException('新密码至少 6 位')

    const user = await this.prisma.user.findUnique({ where: { phone } })
    if (!user) throw new NotFoundException('该手机号尚未注册')

    const consume = this.sms.consume(phone, dto.code)
    if (!consume.ok) throw new BadRequestException(consume.error)

    // 仅更新密码哈希，保留全部测评历史数据（与参考一致）。
    const passwordHash = await bcrypt.hash(dto.newPassword, 10)
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
    return { ok: true }
  }

  async refresh(dto: RefreshDto): Promise<AuthTokens> {
    if (!dto.refreshToken) throw new UnauthorizedException('缺少 refreshToken')
    const refreshSecret = this.config.get<string>('REFRESH_JWT_SECRET') ?? DEV_REFRESH_SECRET
    let payload: any
    try {
      payload = this.jwt.verify(dto.refreshToken, { secret: refreshSecret })
    } catch {
      throw new UnauthorizedException('refreshToken 无效或已过期，请重新登录')
    }
    if (payload?.type !== 'refresh') throw new UnauthorizedException('refreshToken 类型错误')
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) throw new UnauthorizedException('账号不存在')
    return this.issueTokens(user.id, user.phone)
  }
}
