import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { questions, partOrder, partStart, partRange, chapters } from './questions.data'
import { cleanText, cleanOpt } from './clean'
import {
  computeCategory,
  computeResults,
  toSparse,
  fromSparse,
} from './scoring'
import type { SurveyResult, PartMeta, PartResponse, QuestionDto } from '../types/quiz'

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  // —— 元数据：5 大部分信息（不含题目与算分键） ——
  meta(): { parts: PartMeta[] } {
    const parts = partOrder.map((_, p) => {
      const { start, end } = partRange(p)
      const ch = chapters[p]
      return {
        index: p,
        title: ch.title,
        count: ch.count,
        intro: ch.intro,
        hint: ch.hint,
        qCount: end - start,
      }
    })
    return { parts }
  }

  // —— 单部分题目（仅文本+选项，绝不含 m/dim） ——
  getPart(i: number): PartResponse {
    if (i < 0 || i >= partOrder.length) throw new BadRequestException('部分索引越界')
    const { start, end } = partRange(i)
    const questions_: QuestionDto[] = []
    for (let g = start; g < end; g++) {
      const q = questions[g]
      questions_.push({
        index: g,
        partIndex: i,
        text: cleanText(q.text) || '请选择更合你心意的一项',
        options: q.a.map((o) => cleanOpt(o)),
      })
    }
    return { index: i, title: chapters[i].title, hint: chapters[i].hint, questions: questions_ }
  }

  // 取或创建「当前测评」：进行中的复用，已完成则开新的一条。
  private async getOrCreateAssessment(userId: number) {
    const latest = await this.prisma.assessment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    if (latest && latest.status !== 'completed') return latest
    return this.prisma.assessment.create({ data: { userId, status: 'in_progress' } })
  }

  private async computeDoneParts(assessmentId: number): Promise<boolean[]> {
    const a = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { answers: true },
    })
    const done: boolean[] = partOrder.map(() => false)
    if (!a) return done
    const answered = new Set(a.answers.map((x) => x.questionIndex))
    partOrder.forEach((_, p) => {
      const { start, end } = partRange(p)
      let all = true
      for (let i = start; i < end; i++) if (!answered.has(i)) { all = false; break }
      done[p] = all
    })
    return done
  }

  private allDone(done: boolean[]): boolean {
    return done.every(Boolean)
  }

  // —— 提交某部分作答：存 Answer + 增量算分存 Result，更新进度 ——
  async submitPart(userId: number, i: number, answers: number[]): Promise<{ ok: true; doneParts: boolean[] }> {
    if (i < 0 || i >= partOrder.length) throw new BadRequestException('部分索引越界')
    const { start, end } = partRange(i)
    const size = end - start
    if (!Array.isArray(answers) || answers.length !== size) {
      throw new BadRequestException(`本部分需提交 ${size} 个答案`)
    }
    // 校验选项下标合法
    for (let k = 0; k < size; k++) {
      const choice = answers[k]
      if (choice == null) continue
      if (!Number.isInteger(choice) || choice < 0 || choice >= questions[start + k].a.length) {
        throw new BadRequestException(`第 ${k + 1} 题选项下标非法`)
      }
    }

    const assessment = await this.getOrCreateAssessment(userId)

    // 现有作答（用于算分合并）
    const existing = await this.prisma.answer.findMany({ where: { assessmentId: assessment.id } })
    const full: (number | null)[] = new Array(questions.length).fill(null)
    existing.forEach((a) => (full[a.questionIndex] = a.choice))
    for (let k = 0; k < size; k++) {
      const g = start + k
      const choice = answers[k]
      if (choice == null) continue
      full[g] = choice
      await this.prisma.answer.upsert({
        where: { assessmentId_questionIndex: { assessmentId: assessment.id, questionIndex: g } },
        create: { assessmentId: assessment.id, questionIndex: g, partIndex: i, choice },
        update: { choice },
      })
    }

    // 增量算分并保存该类别结果
    const category = partOrder[i]
    const payload = computeCategory(category, full)
    await this.prisma.result.upsert({
      where: { assessmentId_category: { assessmentId: assessment.id, category } },
      create: { assessmentId: assessment.id, category, payload: payload as any },
      update: { payload: payload as any },
    })

    const doneParts = await this.computeDoneParts(assessment.id)
    const status = this.allDone(doneParts) ? 'completed' : 'in_progress'
    await this.prisma.assessment.update({ where: { id: assessment.id }, data: { status } })
    return { ok: true, doneParts }
  }

  // —— 提交全量作答：重算并保存全部 5 个类别结果 ——
  async submitAll(userId: number, answers: number[]): Promise<{ ok: true; result: SurveyResult }> {
    if (!Array.isArray(answers) || answers.length !== questions.length) {
      throw new BadRequestException(`需提交全部 ${questions.length} 题答案`)
    }
    const assessment = await this.getOrCreateAssessment(userId)

    await this.prisma.$transaction(async (tx) => {
      for (let g = 0; g < questions.length; g++) {
        const choice = answers[g]
        if (choice == null) continue
        if (!Number.isInteger(choice) || choice < 0 || choice >= questions[g].a.length) continue
        const p = partOrder.indexOf(questions[g].type)
        await tx.answer.upsert({
          where: { assessmentId_questionIndex: { assessmentId: assessment.id, questionIndex: g } },
          create: { assessmentId: assessment.id, questionIndex: g, partIndex: p, choice },
          update: { choice },
        })
      }
      const result = computeResults(answers)
      const categories: ('mbti' | 'disc' | 'pdp' | 'enneagram' | 'career')[] = [
        'mbti', 'disc', 'pdp', 'enneagram', 'career',
      ]
      for (const c of categories) {
        await tx.result.upsert({
          where: { assessmentId_category: { assessmentId: assessment.id, category: c } },
          create: { assessmentId: assessment.id, category: c, payload: result[c] as any },
          update: { payload: result[c] as any },
        })
      }
    })

    await this.prisma.assessment.update({ where: { id: assessment.id }, data: { status: 'completed' } })
    return { ok: true, result: computeResults(answers) }
  }

  // —— 进度：已完成部分 + 稀疏答案（前端离线缓存用） ——
  async progress(userId: number): Promise<{ assessmentId: number | null; doneParts: boolean[]; sparse: Record<number, number> }> {
    const a = await this.prisma.assessment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { answers: true },
    })
    if (!a) {
      return { assessmentId: null, doneParts: partOrder.map(() => false), sparse: {} }
    }
    const full = fromSparse({})
    a.answers.forEach((x) => (full[x.questionIndex] = x.choice))
    return { assessmentId: a.id, doneParts: await this.computeDoneParts(a.id), sparse: toSparse(full) }
  }

  // —— 结果：从最新测评的 Result 重建完整画像 ——
  async getResult(userId: number): Promise<SurveyResult | null> {
    const a = await this.prisma.assessment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { results: true },
    })
    if (!a || a.results.length < 5) return null
    const map: Record<string, any> = {}
    a.results.forEach((r) => (map[r.category] = r.payload))
    if (!map.mbti || !map.disc || !map.pdp || !map.ennea || !map.career) return null
    return {
      mbti: map.mbti,
      disc: map.disc,
      pdp: map.pdp,
      ennea: map.ennea,
      career: map.career,
    }
  }

  // —— 报告用：取最新测评（含答案+结果），供 report.service 重建明细 ——
  async getLatestAssessmentForReport(userId: number) {
    return this.prisma.assessment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { answers: true, results: true, user: true },
    })
  }
}
