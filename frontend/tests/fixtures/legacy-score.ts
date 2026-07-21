// 旧算法基准：原 index.html 中 computeResults / pct100 的【原样】拷贝（不改写）。
// 仅用于「新旧算法结果对照测试」，验证 src/utils/score.ts 的移植是否保真。
// 原版中这两个函数读取全局 answers / questions / mbtiTypes；
// 此处 questions / mbtiTypes 从同一份数据模块导入，answers 以模块级变量模拟全局。
import { questions, mbtiTypes } from '@/data/questions'
import type { SurveyResult } from '@/types/quiz'

let answers: (number | null)[] = []

export function setAnswers(a: (number | null)[]): void { answers = a }

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

export function computeResults(): SurveyResult {
  // MBTI
  const cnt = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
  questions.forEach((q, i) => { if (q.type === 'mbti' && answers[i] !== null) cnt[q.m![answers[i]] as keyof typeof cnt]++ })
  const type = [cnt.E >= cnt.I ? 'E' : 'I', cnt.S >= cnt.N ? 'S' : 'N', cnt.T >= cnt.F ? 'T' : 'F', cnt.J >= cnt.P ? 'J' : 'P'].join('')
  const [nm, ds] = mbtiTypes[type as keyof typeof mbtiTypes]
  const pairs = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']].map(([a, b]) => {
    const va = cnt[a as keyof typeof cnt], vb = cnt[b as keyof typeof cnt], tot = va + vb
    const pa = tot ? Math.round((va / tot) * 100) : 50
    const pb = tot ? 100 - pa : 50
    return { a, b, pa, pb }
  })
  // DISC（4 维，百分比合计强制=100）
  const dScore = { D: 0, I: 0, S: 0, C: 0 }
  questions.forEach((q, i) => { if (q.type === 'disc' && answers[i] !== null) dScore[q.m![answers[i]] as keyof typeof dScore]++ })
  const dKeys = ['D', 'I', 'S', 'C']
  const dRates = pct100(dKeys.map((k) => dScore[k as keyof typeof dScore]))
  const disc = dKeys.map((k, i) => ({ label: k, rate: dRates[i] }))
  // PDP（5 维，百分比合计强制=100）
  const pScore = { T: 0, P: 0, K: 0, O: 0, C: 0 }
  questions.forEach((q, i) => { if (q.type === 'pdp' && answers[i] !== null) pScore[q.dim as keyof typeof pScore] += (5 - answers[i]) })
  const pKeys = [['T', 'T'], ['P', 'P'], ['K', 'K'], ['O', 'O'], ['C', 'C']]
  const pRates = pct100(pKeys.map(([, k]) => pScore[k as keyof typeof pScore]))
  const pdp = pKeys.map(([lab], i) => ({ label: lab, rate: pRates[i] }))
  // 九型（9 维，百分比合计强制=100）
  const eScore = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0 }
  questions.forEach((q, i) => { if (q.type === 'enneagram' && answers[i] !== null) eScore[q.m![answers[i]] as keyof typeof eScore]++ })
  const eKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
  const eRates = pct100(eKeys.map((k) => eScore[k as keyof typeof eScore]))
  const ennea = eKeys.map((k, i) => ({ label: k, rate: eRates[i] }))
  // 职业锚（5 维，百分比合计强制=100）
  const cScore = { X: 0, Y: 0, Z: 0, W: 0, V: 0 }
  questions.forEach((q, i) => { if (q.type === 'career' && answers[i] !== null) cScore[q.m![answers[i]] as keyof typeof cScore]++ })
  const cKeys = [['X'], ['Y'], ['Z'], ['W'], ['V']]
  const cRates = pct100(cKeys.map(([k]) => cScore[k as keyof typeof cScore]))
  const career = cKeys.map(([k], i) => ({ label: k, rate: cRates[i] }))
  return { mbti: { type, name: nm, desc: ds, pairs }, disc, pdp, ennea, career }
}
