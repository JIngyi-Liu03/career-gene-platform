// 新旧算法结果对照测试（Node 内置运行，无需 vitest）。
// 对照 src/utils/score.ts（新算法）与 tests/fixtures/legacy-score.ts（原 index.html 原样搬运的旧算法）。
import assert from 'node:assert'
import { questions } from '@/data/questions'
import { computeResults as newCompute, pct100 as newPct } from '@/utils/score'
import { computeResults as legacyCompute, pct100 as legacyPct, setAnswers } from './fixtures/legacy-score.ts'

// 确定性伪随机，保证测试可重复
function makeAnswers(seed) {
  let s = seed >>> 0
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  return questions.map((q) => {
    const max = q.m ? q.m.length : 5
    return Math.floor(rnd() * max)
  })
}
function sumRates(arr) { return arr.reduce((a, b) => a + b.rate, 0) }

let pass = 0, fail = 0
function check(name, fn) {
  try { fn(); pass++; console.log('  ✓', name) }
  catch (e) { fail++; console.error('  ✗', name, '\n', e && e.message) }
}

console.log('新旧算法结果对照测试')
check('pct100 新旧实现输出完全一致 (30 组)', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const raw = makeAnswers(seed).map((_, i) => (i % 7) + 1)
    assert.deepStrictEqual(newPct(raw), legacyPct(raw))
  }
})
check('computeResults 新旧实现输出深度一致 (50 组)', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const ans = makeAnswers(seed)
    setAnswers(ans)
    assert.deepStrictEqual(newCompute(ans), legacyCompute())
  }
})
check('全 null 答案稳定输出且不抛错 + 不变量', () => {
  const ans = questions.map(() => null)
  setAnswers(ans)
  const fresh = newCompute(ans)
  const legacy = legacyCompute()
  assert.deepStrictEqual(fresh, legacy)
  assert.strictEqual(sumRates(fresh.disc), 100)
  assert.strictEqual(sumRates(fresh.pdp), 100)
  assert.strictEqual(sumRates(fresh.ennea), 100)
  assert.strictEqual(sumRates(fresh.career), 100)
  fresh.mbti.pairs.forEach((p) => assert.strictEqual(p.pa + p.pb, 100))
})

console.log(`\n结果：${pass} 通过, ${fail} 失败`)
process.exit(fail ? 1 : 0)
