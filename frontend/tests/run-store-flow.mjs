// 运行时验证：在 Node 中用最小桩跑通 surveyStore 全流程（登录→逐部分作答→提交→算分）。
// 与 run-compare.mjs 共用 alias-loader；验证搬家后 store 逻辑的实际行为，而非仅编译通过。

// —— 最小 DOM / 网络桩 ——
const mem = {}
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v) },
  removeItem: (k) => { delete mem[k] },
}
// fetch 始终返回“后端无记录”，使登录走本地恢复分支
globalThis.fetch = async () => ({ ok: true, json: async () => ({ records: [] }) })

let failed = 0
function assert(cond, msg) {
  if (!cond) { console.error('  ✗ ' + msg); failed++ } else { console.log('  ✓ ' + msg) }
}

const { surveyStore } = await import('@/stores/survey')
const { partStart, questions } = await import('@/data/questions')

const PART_COUNT = 5

console.log('surveyStore 全流程运行时验证')
await surveyStore.login('张三', '13800138000')
assert(surveyStore.state.user.nickname === '13800138000', 'login 设置手机号')
assert(surveyStore.state.user.name === '张三', 'login 设置姓名')
assert(surveyStore.progress.value.count === 0, '初始进度 0/5')

for (let p = 0; p < PART_COUNT; p++) {
  surveyStore.startChapter(p)
  surveyStore.enterChapter()
  const start = partStart[p]
  const end = p < PART_COUNT - 1 ? partStart[p + 1] : questions.length
  for (let i = start; i < end; i++) surveyStore.choose(0) // 始终选 A
  assert(surveyStore.isPartDone(p), '第 ' + (p + 1) + ' 部分作答完成')
}
assert(surveyStore.progress.value.count === 5, '全部 5/5 完成')

const R = surveyStore.submitAll()
assert(!!R && R.mbti && R.mbti.type.length === 4, 'submitAll 返回 MBTI 四字母类型: ' + (R && R.mbti && R.mbti.type))
assert(R.disc.length === 4, 'DISC 轴数=4')
assert(R.pdp.length === 5, 'PDP 轴数=5')
assert(R.ennea.length === 9, '九型 轴数=9')
assert(R.career.length === 5, '职业锚 轴数=5')

const sum = (arr) => arr.reduce((a, b) => a + b.rate, 0)
assert(sum(R.disc) === 100, 'DISC 百分比合计=100')
assert(sum(R.pdp) === 100, 'PDP 百分比合计=100')
assert(sum(R.ennea) === 100, '九型 百分比合计=100')
assert(sum(R.career) === 100, '职业锚 百分比合计=100')

// 中途退出（discardSession）后，已提交部分仍保留（answers 不丢）
surveyStore.discardSession()
assert(surveyStore.progress.value.count === 5, 'discardSession 不清除已提交进度')

console.log(failed === 0 ? '\n结果：store 全流程运行时验证 通过' : `\n结果：${failed} 项失败`)
process.exitCode = failed === 0 ? 0 : 1
