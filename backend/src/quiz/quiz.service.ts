import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { questions, partOrder, partStart, partRange, chapters, initBank } from './bank'
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

  // 启动期把题库从 DB 加载到内存（空则自动灌种子）。
  async onModuleInit(): Promise<void> {
    await initBank(this.prisma)
  }

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
      create: { assessmentId: assessment.id, category, payload: JSON.stringify(payload) },
      update: { payload: JSON.stringify(payload) },
    })

    const doneParts = await this.computeDoneParts(assessment.id)
    const status = this.allDone(doneParts) ? 'completed' : 'in_progress'
    await this.prisma.assessment.update({ where: { id: assessment.id }, data: { status } })
    return { ok: true, doneParts }
  }

  // —— 提交全量作答：先算结果，再在单个事务内原子地建测评并写入答案+结果 ——
  // 任何一步失败都会整体回滚，绝不会留下空测评记录（避免后台/进度被清零）。
  async submitAll(userId: number, answers: number[]): Promise<{ ok: true; result: SurveyResult }> {
    if (!Array.isArray(answers) || answers.length !== questions.length) {
      throw new BadRequestException(`需提交全部 ${questions.length} 题答案`)
    }
    // 先算结果：答案无法生成画像时提前失败，且此时尚未创建任何测评记录。
    let result: SurveyResult
    try {
      result = computeResults(answers)
    } catch (e) {
      throw new BadRequestException('答题数据无法生成结果：' + (e instanceof Error ? e.message : '格式异常'))
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const assessment = await tx.assessment.create({ data: { userId, status: 'in_progress' } })
      for (let g = 0; g < questions.length; g++) {
        const choice = answers[g]
        if (choice == null) continue
        if (!Number.isInteger(choice) || choice < 0 || choice >= questions[g].a.length) continue
        const p = partOrder.indexOf(questions[g].type)
        if (p < 0) continue // 跳过未归类题目，避免写入非法 partIndex
        await tx.answer.upsert({
          where: { assessmentId_questionIndex: { assessmentId: assessment.id, questionIndex: g } },
          create: { assessmentId: assessment.id, questionIndex: g, partIndex: p, choice },
          update: { choice },
        })
      }
      // category（存储键）与 SurveyResult 对象键的映射：九型人格存储为 'enneagram'，对象键为 'ennea'。
      const resultKey: Record<string, keyof SurveyResult> = {
        mbti: 'mbti', disc: 'disc', pdp: 'pdp', enneagram: 'ennea', career: 'career',
      }
      const categories = Object.keys(resultKey) as (keyof typeof resultKey)[]
      for (const c of categories) {
        const key = resultKey[c]
        await tx.result.upsert({
          where: { assessmentId_category: { assessmentId: assessment.id, category: c } },
          create: { assessmentId: assessment.id, category: c, payload: JSON.stringify(result[key]) },
          update: { payload: JSON.stringify(result[key]) },
        })
      }
        await tx.assessment.update({ where: { id: assessment.id }, data: { status: 'completed' } })
      })
    } catch (e) {
      console.error('submitAll transaction failed:', e)
      throw new BadRequestException('提交失败，请稍后重试')
    }

    return { ok: true, result }
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
      include: { results: true, answers: true },
    })
    if (!a || a.results.length < 5) return null
    const map: Record<string, any> = {}
    a.results.forEach((r) => (map[r.category] = JSON.parse(r.payload as string)))
    if (!map.mbti || !map.disc || !map.pdp || !map.enneagram || !map.career) return null
    const full = new Array(questions.length).fill(null)
    a.answers.forEach((x) => (full[x.questionIndex] = x.choice))
    return {
      mbti: map.mbti,
      disc: map.disc,
      pdp: map.pdp,
      ennea: map.enneagram,
      career: map.career,
      answers: toSparse(full),
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
