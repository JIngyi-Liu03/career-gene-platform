import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { SECURITY_QUESTIONS } from '../quiz/desc.data'
import { partOrder, partStart, questions } from '../quiz/bank'
import { ACCESS_TTL, REFRESH_TTL, DEV_ACCESS_SECRET, DEV_REFRESH_SECRET } from './jwt.constants'
import type { RegisterDto, LoginDto, RecoverDto, RefreshDto, AuthTokens } from './dto'

function isPhone(p: string): boolean {
  return /^1\d{10}$/.test(p || '')
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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

    const user = await this.prisma.user.create({
      data: { phone, name, company: dto.company?.trim() || null, passwordHash, securityQuestion: dto.securityQuestion, securityAnswerHash },
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
