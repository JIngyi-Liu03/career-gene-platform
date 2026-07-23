import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { timingSafeEqual } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import type { QuestionBank, PartType } from '../types/quiz'
import {
  questions,
  partOrder,
  partRange,
  reloadBank,
  toRows,
} from '../quiz/bank'
import { PART_DIMENSIONS, PART_LABELS, PART_SCORING_NOTE } from './dimensions'
import type { AdminLoginDto, AdminQuestionInput, UpdatePartBody } from './dto'
import { DEV_ACCESS_SECRET } from '../auth/jwt.constants'
import { dayKey } from '../common/util'

interface AdminJwtPayload {
  sub: number
  username: string
  type: 'admin'
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name)

  // 登录失败计数（内存级防爆破，按 username@ip 维度限流）。
  private readonly failMap = new Map<string, { count: number; until: number }>()
  private readonly MAX_FAIL = 5
  private readonly LOCK_MS = 10 * 60 * 1000

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // —— 登录（公开，带防爆破限流） ——
  async login(dto: AdminLoginDto, ip: string): Promise<{ accessToken: string; username: string }> {
    const username = (dto?.username || '').trim()
    const password = dto?.password || ''
    const key = `${username}@${ip}`

    const locked = this.failMap.get(key)
    if (locked && locked.until > Date.now()) {
      const remainMin = Math.ceil((locked.until - Date.now()) / 60000)
      throw new UnauthorizedException(`尝试次数过多，请 ${remainMin} 分钟后再试`)
    }

    const expectUser = this.config.get<string>('ADMIN_USERNAME')?.trim() || 'admin'
    const expectPass = this.config.get<string>('ADMIN_PASSWORD') || ''
    const expectHash = this.config.get<string>('ADMIN_PASSWORD_HASH')?.trim() || ''

    const userOk = timingSafeEqual(Buffer.from(username), Buffer.from(expectUser))
    let passOk = false
    if (expectHash) {
      passOk = await bcrypt.compare(password, expectHash)
    } else if (expectPass) {
      passOk = timingSafeEqual(Buffer.from(password), Buffer.from(expectPass))
    }

    if (!userOk || !passOk) {
      const rec = this.failMap.get(key) || { count: 0, until: 0 }
      rec.count += 1
      if (rec.count >= this.MAX_FAIL) {
        rec.until = Date.now() + this.LOCK_MS
        this.logger.warn(`Admin 登录锁定：${key}（连续失败 ${rec.count} 次）`)
      }
      this.failMap.set(key, rec)
      throw new UnauthorizedException('账号或密码错误')
    }

    this.failMap.delete(key)
    const secret = this.config.get<string>('ACCESS_JWT_SECRET') ?? DEV_ACCESS_SECRET
    const accessToken = this.jwt.sign(
      { sub: 1, username, type: 'admin' } as AdminJwtPayload,
      { secret, expiresIn: '2h' },
    )
    this.logger.log(`Admin 登录成功：${username}`)
    return { accessToken, username }
  }

  // —— 完整题库（含算分键 m/dim，仅管理员可看） ——
  async getBank(): Promise<{
    currentVersion: number | null
    parts: {
      index: number
      type: PartType
      label: string
      dimensions: string[]
      scoringNote: string
      questions: AdminQuestionInput[]
    }[]
  }> {
    const parts = partOrder.map((type, i) => ({
      index: i,
      type,
      label: PART_LABELS[type],
      dimensions: PART_DIMENSIONS[type],
      scoringNote: PART_SCORING_NOTE[type],
      questions: questions
        .filter((q) => q.type === type)
        .map((q) => ({
          type: q.type,
          sec: q.sec ?? null,
          text: q.text,
          options: q.a,
          m: q.m ?? null,
          dim: q.dim ?? null,
        })),
    }))
    const last = await this.prisma.questionBankVersion.findFirst({ orderBy: { version: 'desc' } })
    return { currentVersion: last?.version ?? null, parts }
  }

  // —— 保存某部分题库（写库 + 热更新 + 记版本） ——
  async updatePart(
    i: number,
    body: UpdatePartBody,
    operator: string,
  ): Promise<{ ok: true; version: number }> {
    const partType = partOrder[i] as PartType | undefined
    if (!partType) throw new BadRequestException('部分索引越界')
    const dims = PART_DIMENSIONS[partType]
    const dimsSet = new Set(dims)

    const qs = body?.questions
    if (!Array.isArray(qs) || qs.length === 0) throw new BadRequestException('题目不能为空')

    const newPart: QuestionBank[] = qs.map((q, idx) => {
      if (!q || !Array.isArray(q.options) || q.options.length < 2) {
        throw new BadRequestException(`第 ${idx + 1} 题至少需要 2 个选项`)
      }
      q.options.forEach((o, oi) => {
        if (typeof o !== 'string' || !o.trim()) {
          throw new BadRequestException(`第 ${idx + 1} 题第 ${oi + 1} 个选项不能为空`)
        }
      })
      if (partType === 'pdp') {
        if (!q.dim || !dimsSet.has(q.dim)) {
          throw new BadRequestException(`第 ${idx + 1} 题 PDP 维度必须为 ${dims.join('/')} 之一`)
        }
        return { type: partType, sec: q.sec ?? undefined, text: q.text ?? '', a: q.options, dim: q.dim }
      }
      if (!Array.isArray(q.m) || q.m.length !== q.options.length) {
        throw new BadRequestException(`第 ${idx + 1} 题算分键 m 数量需与选项数一致（${q.options.length}）`)
      }
      q.m.forEach((letter, k) => {
        if (typeof letter !== 'string' || !dimsSet.has(letter)) {
          throw new BadRequestException(
            `第 ${idx + 1} 题第 ${k + 1} 项算分键「${letter}」非法（应为 ${dims.join('/')}）`,
          )
        }
      })
      return { type: partType, sec: q.sec ?? undefined, text: q.text ?? '', a: q.options, m: q.m }
    })

    // 按 part 顺序重建全量题库，保持全局 sortOrder 连续。
    const buckets = partOrder.map(() => [] as QuestionBank[])
    for (const q of questions) buckets[partOrder.indexOf(q.type as PartType)].push(q)
    buckets[i] = newPart
    const full = buckets.flat()

    // 原子写库 + 热更新内存。
    await this.prisma.$transaction(async (tx) => {
      await tx.question.deleteMany({})
      await tx.question.createMany({ data: toRows(full) })
    })
    await reloadBank(this.prisma)

    // 记版本快照。
    const last = await this.prisma.questionBankVersion.findFirst({ orderBy: { version: 'desc' } })
    const next = (last?.version ?? 0) + 1
    await this.prisma.questionBankVersion.create({
      data: { version: next, note: body?.note || null, operator, snapshot: JSON.stringify(full) },
    })
    this.logger.log(`题库保存成功：部分 ${i}(${partType}) → v${next} by ${operator}`)
    return { ok: true, version: next }
  }

  // —— 回滚到指定版本（写库 + 热更新 + 记一条新版本） ——
  async rollback(version: number, operator: string): Promise<{ ok: true; version: number }> {
    const v = await this.prisma.questionBankVersion.findUnique({ where: { version } })
    if (!v) throw new NotFoundException('版本不存在')
    const snap = JSON.parse(v.snapshot as string) as QuestionBank[]
    if (!Array.isArray(snap) || !snap.length) throw new BadRequestException('快照数据无效')

    const full: QuestionBank[] = snap.map((q) => ({
      type: q.type,
      sec: q.sec ?? undefined,
      text: q.text ?? '',
      a: q.a ?? [],
      ...(q.dim ? { dim: q.dim } : { m: q.m ?? [] }),
    }))

    await this.prisma.$transaction(async (tx) => {
      await tx.question.deleteMany({})
      await tx.question.createMany({ data: toRows(full) })
    })
    await reloadBank(this.prisma)

    const last = await this.prisma.questionBankVersion.findFirst({ orderBy: { version: 'desc' } })
    const next = (last?.version ?? 0) + 1
    await this.prisma.questionBankVersion.create({
      data: { version: next, note: `回滚至 v${version}`, operator, snapshot: JSON.stringify(full) },
    })
    this.logger.log(`题库回滚：v${version} → v${next} by ${operator}`)
    return { ok: true, version: next }
  }

  // —— 版本列表 ——
  async getVersions(): Promise<
    { version: number; note: string | null; operator: string; createdAt: Date }[]
  > {
    return this.prisma.questionBankVersion.findMany({
      orderBy: { version: 'desc' },
      select: { version: true, note: true, operator: true, createdAt: true },
    })
  }

  // —— 统计概览 ——
  async getStats(): Promise<{
    registered: number
    partLabels: string[]
    partDoneCounts: number[]
    allCompleted: number
  }> {
    const registered = await this.prisma.user.count()
    const assessments = await this.prisma.assessment.findMany({
      select: { answers: { select: { questionIndex: true } } },
    })
    const partDoneCounts = partOrder.map(() => 0)
    let allCompleted = 0
    for (const a of assessments) {
      const answered = new Set(a.answers.map((x) => x.questionIndex))
      let all = true
      partOrder.forEach((_, p) => {
        const { start, end } = partRange(p)
        let done = true
        for (let k = start; k < end; k++) {
          if (!answered.has(k)) {
            done = false
            break
          }
        }
        if (done) partDoneCounts[p]++
        if (!done) all = false
      })
      if (all) allCompleted++
    }
    return {
      registered,
      partLabels: partOrder.map((t) => PART_LABELS[t]),
      partDoneCounts,
      allCompleted,
    }
  }

  // —— 每用户完成情况 ——
  async getUsers(): Promise<
    {
      id: number
      phone: string
      name: string
      registeredAt: Date
      doneParts: boolean[]
      answeredCount: number
      total: number
      completion: number
    }[]
  > {
    const total = questions.length
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phone: true,
        name: true,
        createdAt: true,
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { answers: { select: { questionIndex: true } } },
        },
      },
    })
    return users.map((u) => {
      const a = u.assessments[0]
      const answered = a ? new Set(a.answers.map((x) => x.questionIndex)) : new Set<number>()
      const doneParts = partOrder.map((_, p) => {
        const { start, end } = partRange(p)
        for (let k = start; k < end; k++) if (!answered.has(k)) return false
        return true
      })
      const answeredCount = answered.size
      const completion = total ? Math.round((answeredCount / total) * 100) : 0
      return {
        id: u.id,
        phone: u.phone,
        name: u.name,
        registeredAt: u.createdAt,
        doneParts,
        answeredCount,
        total,
        completion,
      }
    })
  }

  // —— 每日访问量（按天聚合，补零） ——
  async getVisits(days = 30): Promise<{ day: string; count: number }[]> {
    const n = Math.max(1, Math.min(365, Number(days) || 30))
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - (n - 1))
    const startDateStr = dayKey(start)

    const groups = await this.prisma.visit.groupBy({
      by: ['day'],
      where: { day: { gte: startDateStr } },
      _count: { _all: true },
    })
    const map = new Map(groups.map((g) => [g.day, g._count._all]))

    const out: { day: string; count: number }[] = []
    for (let d = 0; d < n; d++) {
      const dt = new Date(start)
      dt.setDate(start.getDate() + d)
      const key = dayKey(dt)
      out.push({ day: key, count: map.get(key) ?? 0 })
    }
    return out
  }
}
