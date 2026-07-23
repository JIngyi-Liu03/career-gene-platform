// 运行时题库单例（替代原写死的 questions.data.ts 导出）。
// 从数据库 Question 表加载，提供可重赋值的 live binding（questions/partStart/partId）
// 与 partRange()；Admin 保存后调用 reloadBank() 即可让全站（用户答题/算分/报告）实时生效。
import type { PrismaService } from '../prisma/prisma.service'
import type { QuestionBank, PartType } from '../types/quiz'
import { seedQuestions, partOrder as PART_ORDER, secHints, chapters } from './questions.data'

// 静态元信息（不随题库编辑改变）。
export const partOrder = PART_ORDER
export { secHints, chapters }

// —— 运行时可变状态（ES module live binding，供 scoring/quiz.service/report 实时读取） ——
export let questions: QuestionBank[] = seedQuestions.slice()
export let partStart: Record<number, number> = {}
export let partId: number[] = []

function recompute(): void {
  partId = questions.map((q) => partOrder.indexOf(q.type as PartKey))
  partStart = {}
  partId.forEach((p, i) => {
    if (!(p in partStart)) partStart[p] = i
  })
}
recompute()

type PartKey = (typeof partOrder)[number]

// 第 p 部分题目的全局题号区间 [start, end)。
export function partRange(p: number): { start: number; end: number } {
  const start = partStart[p]
  const end = p < partOrder.length - 1 ? partStart[p + 1] : questions.length
  return { start, end }
}

// DB 行 → 运行时 QuestionBank 结构（SQLite 下 options/scoring 以 JSON 字符串存储）。
function fromRows(rows: {
  type: string
  sec: number | null
  text: string
  options: unknown
  scoring: any
}[]): QuestionBank[] {
  return rows.map((r) => {
    const options = JSON.parse((r.options as string) || '[]') as string[]
    const scoring = JSON.parse((r.scoring as string) || '{}') as { m?: string[]; dim?: string }
    return {
      type: r.type as PartType,
      sec: r.sec ?? undefined,
      text: r.text,
      a: options || [],
      ...(scoring?.dim ? { dim: scoring.dim as string } : {}),
      ...(scoring?.m ? { m: scoring.m as string[] } : {}),
    }
  })
}

// 运行时 QuestionBank → DB 行（含 sortOrder 全局唯一序号）。
export function toRows(qs: QuestionBank[]): {
  partIndex: number
  type: string
  sec: number | null
  dim: string | null
  text: string
  options: string
  scoring: string
  sortOrder: number
}[] {
  return qs.map((q, i) => ({
    partIndex: partOrder.indexOf(q.type as PartKey),
    type: q.type,
    sec: q.sec ?? null,
    dim: q.dim ?? null,
    text: q.text,
    options: JSON.stringify(q.a),
    scoring: JSON.stringify(q.dim ? { dim: q.dim } : { m: q.m ?? [] }),
    sortOrder: i,
  }))
}

// 首次启动：若 Question 表为空则从种子灌库，再加载到内存。
export async function initBank(prisma: PrismaService): Promise<void> {
  let rows = await prisma.question.findMany({ orderBy: { sortOrder: 'asc' } })
  if (rows.length === 0) {
    await prisma.question.createMany({ data: toRows(seedQuestions) })
    rows = await prisma.question.findMany({ orderBy: { sortOrder: 'asc' } })
  }
  questions = fromRows(rows)
  recompute()
}

// 热更新：从数据库重新读取全量题库到内存（Admin 保存后调用）。
export async function reloadBank(prisma: PrismaService): Promise<void> {
  const rows = await prisma.question.findMany({ orderBy: { sortOrder: 'asc' } })
  questions = fromRows(rows)
  recompute()
}
