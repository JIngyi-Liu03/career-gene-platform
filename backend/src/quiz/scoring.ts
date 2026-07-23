// 算分引擎（业务内部）：由原前端 score.ts computeResults / pct100 精确搬运，
// 并拆分为「按类别增量计算」，以支持每个部分单独提交并保存结果。
import { questions, partOrder, partId } from './bank'
import { mbtiTypes, discDesc } from './desc.data'
import type { SurveyResult, RadarAxis, MbtiResult, CategoryKey } from '../types/quiz'

export type Answers = (number | null)[]

// 将各维度原始得分换算为合计恰好=100 的整数百分比。
export function pct100(raw: number[]): number[] {
  const tot = raw.reduce((a, b) => a + b, 0)
  if (tot <= 0) return pct100(raw.map(() => 1))
  const exact = raw.map((v) => (v / tot) * 100)
  const fl = exact.map((v) => Math.floor(v))
  let rem = 100 - fl.reduce((a, b) => a + b, 0)
  const order = exact.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac)
  const out = fl.slice()
  for (let k = 0; k < rem; k++) out[order[k % out.length].i]++
  return out
}

function isAnswered(a: number | null): a is number {
  return a !== null && a !== undefined
}

export function computeMbti(answers: Answers): MbtiResult {
  const cnt: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
  questions.forEach((q, i) => {
    if (q.type === 'mbti' && isAnswered(answers[i]) && q.m) cnt[q.m[answers[i]]]++
  })
  const type = [cnt.E >= cnt.I ? 'E' : 'I', cnt.S >= cnt.N ? 'S' : 'N', cnt.T >= cnt.F ? 'T' : 'F', cnt.J >= cnt.P ? 'J' : 'P'].join('')
  const [nm, ds] = mbtiTypes[type] || ['未知', '']
  const pairs = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']].map(([a, b]) => {
    const va = cnt[a], vb = cnt[b], tot = va + vb
    const pa = tot ? Math.round((va / tot) * 100) : 50
    const pb = tot ? 100 - pa : 50
    return { a, b, pa, pb }
  })
  return { type, name: nm, desc: ds, pairs }
}

export function computeDisc(answers: Answers): RadarAxis[] {
  const dScore: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 }
  questions.forEach((q, i) => {
    if (q.type === 'disc' && isAnswered(answers[i]) && q.m) dScore[q.m[answers[i]]]++
  })
  const dKeys = ['D', 'I', 'S', 'C']
  const rates = pct100(dKeys.map((k) => dScore[k]))
  return dKeys.map((k, i) => ({ label: k, rate: rates[i] }))
}

export function computePdp(answers: Answers): RadarAxis[] {
  const pScore: Record<string, number> = { T: 0, P: 0, K: 0, O: 0, C: 0 }
  questions.forEach((q, i) => {
    if (q.type === 'pdp' && isAnswered(answers[i]) && q.dim) pScore[q.dim] += 5 - answers[i]
  })
  const pKeys = ['T', 'P', 'K', 'O', 'C']
  const rates = pct100(pKeys.map((k) => pScore[k]))
  return pKeys.map((k, i) => ({ label: k, rate: rates[i] }))
}

export function computeEnnea(answers: Answers): RadarAxis[] {
  const eScore: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0 }
  questions.forEach((q, i) => {
    if (q.type === 'enneagram' && isAnswered(answers[i]) && q.m) eScore[q.m[answers[i]]]++
  })
  const eKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
  const rates = pct100(eKeys.map((k) => eScore[k]))
  return eKeys.map((k, i) => ({ label: k, rate: rates[i] }))
}

export function computeCareer(answers: Answers): RadarAxis[] {
  const cScore: Record<string, number> = { X: 0, Y: 0, Z: 0, W: 0, V: 0 }
  questions.forEach((q, i) => {
    if (q.type === 'career' && isAnswered(answers[i]) && q.m) cScore[q.m[answers[i]]]++
  })
  const cKeys = ['X', 'Y', 'Z', 'W', 'V']
  const rates = pct100(cKeys.map((k) => cScore[k]))
  return cKeys.map((k, i) => ({ label: k, rate: rates[i] }))
}

const COMPUTE: Record<CategoryKey, (a: Answers) => RadarAxis[] | MbtiResult> = {
  mbti: computeMbti as any,
  disc: computeDisc,
  pdp: computePdp,
  enneagram: computeEnnea,
  career: computeCareer,
}

// 计算单个类别（用于某部分提交时增量保存）。
export function computeCategory(category: CategoryKey, answers: Answers): RadarAxis[] | MbtiResult {
  return COMPUTE[category](answers)
}

// 计算完整画像（用于全量提交 / 结果重建）。
export function computeResults(answers: Answers): SurveyResult {
  return {
    mbti: computeMbti(answers),
    disc: computeDisc(answers),
    pdp: computePdp(answers),
    ennea: computeEnnea(answers),
    career: computeCareer(answers),
  }
}

// 由 Answers 数组生成 { 全局题号: 选项下标 } 稀疏结构（用于回传进度）。
export function toSparse(answers: Answers): Record<number, number> {
  const out: Record<number, number> = {}
  answers.forEach((a, i) => { if (isAnswered(a)) out[i] = a })
  return out
}

// 由稀疏结构还原成 Answers 数组（长度与题库一致）。
export function fromSparse(sparse: Record<number, number>): Answers {
  const out: Answers = new Array(questions.length).fill(null)
  Object.keys(sparse).forEach((k) => {
    const i = Number(k)
    if (i >= 0 && i < out.length) out[i] = sparse[k]
  })
  return out
}

export { partOrder, partId }
