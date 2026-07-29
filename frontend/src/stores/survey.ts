// 纯客户端编排层（后端为业务唯一来源）。
// 不再持有题库/算分：只负责拉题、缓存答案(翻页体验+离线兜底)、调接口、渲染状态。
import { reactive, computed } from 'vue'
import { getMeta, getPart, submitPart as apiSubmitPart, submitAll as apiSubmitAll, getProgress, getResult } from '@/api/quiz'
import { login as apiLogin, register as apiRegister } from '@/api/auth'
import { hasTokens, clearTokens } from '@/api/http'
import { isValidPhone, isValidName } from '@/utils/validator'
import type { SurveyResult, QuestionDto, PartMeta } from '@/types/quiz'

interface UserInfo { phone: string; name: string }
interface SurveyState {
  user: UserInfo
  meta: { parts: PartMeta[] } | null
  total: number
  currentPart: number
  sessionPart: number
  sessionAnswers: (number | null)[] | null
  current: number
  answers: (number | null)[] // 稀疏缓存（离线兜底），长度 = total
  partsCache: Record<number, QuestionDto[]>
  result: SurveyResult | null
  doneParts: boolean[]
  viewRecordPart: number | null
  loading: boolean
  freshSession: boolean
}

const ANSWERS_KEY = (phone: string) => 'cg_answers_' + phone
const USER_KEY = 'cg_user'

function loadUser(): UserInfo {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { phone: '', name: '' }
}
function saveUser(u: UserInfo): void {
  try { localStorage.setItem(USER_KEY, JSON.stringify(u)) } catch {}
}
function loadAnswers(phone: string): (number | null)[] | null {
  try {
    const raw = localStorage.getItem(ANSWERS_KEY(phone))
    if (raw) return JSON.parse(raw).answers
  } catch {}
  return null
}
function saveAnswers(phone: string, answers: (number | null)[]): void {
  try { localStorage.setItem(ANSWERS_KEY(phone), JSON.stringify({ answers, ts: Date.now() })) } catch {}
}

const initialUser = loadUser()

const state = reactive<SurveyState>({
  user: initialUser,
  meta: null,
  total: 0,
  currentPart: 0,
  sessionPart: -1,
  sessionAnswers: null,
  current: 0,
  answers: [],
  partsCache: {},
  result: null,
  doneParts: [false, false, false, false, false],
  viewRecordPart: null,
  loading: false,
  freshSession: false,
})

// —— 派生：进度 ——
const progress = computed(() => {
  const done = state.doneParts
  const count = done.filter(Boolean).length
  return { done, count }
})

// 当前部分题号起点（从已缓存的该部分首题全局 index 取得）。
function partStartOf(p: number): number {
  const qs = state.partsCache[p]
  return qs && qs.length ? qs[0].index : 0
}

const currentQuestion = computed<QuestionDto | null>(() => {
  const sp = state.sessionPart
  if (sp < 0 || !state.partsCache[sp]) return null
  return state.partsCache[sp][state.current] || null
})

const quizInfo = computed(() => {
  const sp = state.sessionPart
  if (sp < 0 || !state.partsCache[sp]) return null
  const size = state.partsCache[sp].length
  const localIdx = state.current
  return {
    part: sp,
    title: state.meta?.parts[sp]?.title || '',
    localIdx,
    size,
    percent: Math.round(((localIdx + 1) / size) * 100),
    canPrev: state.current > 0,
    isLast: state.current === size - 1,
  }
})

// 当前部分是否已全部作答（用于提交前校验：必须答完全部才能提交）。
const partAllAnswered = computed(() => {
  const sp = state.sessionPart
  if (sp < 0 || !state.sessionAnswers) return false
  return state.sessionAnswers.every((a) => a != null)
})

function displayName(): string {
  return state.user.name || state.user.phone || '你'
}

// —— 登录态初始化：有 token 则恢复用户并拉取进度 ——
async function init(): Promise<void> {
  if (!hasTokens()) return
  const u = loadUser()
  if (!u.phone) return
  state.user = u
  await Promise.all([loadMeta(), loadProgress()])
}

async function loadMeta(): Promise<void> {
  const m = await getMeta()
  state.meta = m
  state.total = m.parts.reduce((s, p) => s + p.qCount, 0)
  if (state.answers.length !== state.total) {
    const merged = new Array(state.total).fill(null)
    for (let i = 0; i < state.answers.length && i < state.total; i++) merged[i] = state.answers[i]
    state.answers = merged
  }
}

async function loadProgress(): Promise<void> {
  const p = await getProgress()
  state.doneParts = p.doneParts
  // 合并后端稀疏答案到本地缓存（离线兜底）
  const merged = state.answers.length === state.total ? state.answers.slice() : new Array(state.total).fill(null)
  Object.entries(p.sparse).forEach(([k, v]) => {
    const i = Number(k)
    if (i >= 0 && i < merged.length) merged[i] = v
  })
  state.answers = merged
  if (state.user.phone) saveAnswers(state.user.phone, merged)
}

// 确保某部分题目已拉取（缓存）。
async function ensurePart(p: number): Promise<void> {
  if (state.partsCache[p]) return
  const resp = await getPart(p)
  state.partsCache[p] = resp.questions
}

// —— 注册 / 登录 / 找回 ——
async function register(input: { name: string; phone: string; password: string; securityQuestion: string; securityAnswer: string; company?: string }): Promise<boolean> {
  if (!isValidName(input.name) || !isValidPhone(input.phone)) return false
  const d = await apiRegister(input)
  state.user = { phone: input.phone, name: input.name }
  saveUser(state.user)
  state.doneParts = d.doneParts || [false, false, false, false, false]
  const cached = loadAnswers(input.phone)
  if (cached) state.answers = cached
  return true
}

async function login(input: { phone: string; password: string }): Promise<boolean> {
  if (!isValidPhone(input.phone)) return false
  const d = await apiLogin(input)
  state.user = { phone: input.phone, name: d.name || '' }
  saveUser(state.user)
  state.doneParts = d.doneParts || [false, false, false, false, false]
  const cached = loadAnswers(input.phone)
  if (cached) state.answers = cached
  return true
}

function logout(): void {
  clearTokens()
  try { localStorage.removeItem(USER_KEY) } catch {}
  state.user = { phone: '', name: '' }
  state.freshSession = false
  state.answers = new Array(state.total).fill(null)
  state.partsCache = {}
  state.result = null
  state.doneParts = [false, false, false, false, false]
  state.sessionPart = -1
  state.sessionAnswers = null
  state.viewRecordPart = null
}

// —— 答题流程 ——
function startChapter(p: number): void {
  state.currentPart = Number(p)
}

async function enterChapter(fresh = false): Promise<void> {
  const p = state.currentPart
  await ensurePart(p)
  const size = state.partsCache[p].length
  const start = partStartOf(p)
  const sess: (number | null)[] = new Array(size).fill(null)
  if (!fresh) {
    for (let i = 0; i < size; i++) sess[i] = state.answers[start + i] ?? null
  }
  // fresh（重新测试）：保留 state.answers 中的旧记录，仅用空白会话作答，
  // 待提交后才会覆盖；中途退出（discardSession）则旧记录原样保留。
  state.sessionAnswers = sess
  state.sessionPart = p
  state.current = 0
  state.freshSession = fresh
}

// 选择某选项；返回 true 表示本部分已答完（需提交）。
function choose(oi: number): boolean {
  const sp = state.sessionPart
  if (sp < 0 || !state.sessionAnswers) return false
  const localIdx = state.current
  state.sessionAnswers[localIdx] = oi
  const start = partStartOf(sp)
  // 重测空白会话：作答先只写入会话，不覆盖旧记录（提交后才覆盖）。
  if (!state.freshSession) {
    state.answers[start + localIdx] = oi
    if (state.user.phone) saveAnswers(state.user.phone, state.answers)
  }
  if (state.current === state.partsCache[sp].length - 1) return true
  state.current++
  return false
}

function prevQuestion(): void {
  if (state.sessionPart < 0) return
  if (state.current > 0) state.current--
}

function gotoQuestion(i: number): void {
  if (state.sessionPart < 0) return
  const size = state.partsCache[state.sessionPart]?.length || 0
  if (i >= 0 && i < size) state.current = i
}

// 第一道未作答的题号（无则返回当前题）。
function firstUnanswered(): number {
  const sp = state.sessionPart
  if (sp < 0 || !state.sessionAnswers) return state.current
  const i = state.sessionAnswers.findIndex((a) => a == null)
  return i < 0 ? state.current : i
}

function discardSession(): void {
  state.sessionAnswers = null
  state.sessionPart = -1
  state.freshSession = false
}

// 提交当前部分：写缓存 → 调后端 → 刷新进度 → 丢弃会话。
async function submitCurrentPart(): Promise<boolean[]> {
  const p = state.sessionPart
  if (p < 0 || !state.sessionAnswers) return state.doneParts
  const start = partStartOf(p)
  // 定长数组，未作答的题用 null 占位（后端跳过 null）。
  const payload = state.sessionAnswers.map((v) => (v == null ? null : v)) as number[]
  const resp = await apiSubmitPart(p, payload)
  // 同步已答到缓存
  for (let i = 0; i < payload.length; i++) {
    if (payload[i] != null) state.answers[start + i] = payload[i]
  }
  if (state.user.phone) saveAnswers(state.user.phone, state.answers)
  state.doneParts = resp.doneParts
  discardSession()
  return resp.doneParts
}

async function submitAll(): Promise<SurveyResult | null> {
  if (state.answers.length !== state.total) return null
  const payload = state.answers.map((v) => (v == null ? null : v)) as number[]
  const resp = await apiSubmitAll(payload)
  state.result = resp.result
  state.doneParts = [true, true, true, true, true]
  return resp.result
}

async function loadResult(): Promise<SurveyResult | null> {
  const r = await getResult()
  state.result = r
  // 历史/刷新进入结果页时，把后端返回的答案回填进本地缓存，保证“答题记录”能回显。
  if (r?.answers && state.total > 0) {
    const merged = new Array(state.total).fill(null)
    for (let i = 0; i < state.total; i++) {
      const v = r.answers[i]
      if (v !== undefined) merged[i] = v
    }
    state.answers = merged
    if (state.user.phone) saveAnswers(state.user.phone, merged)
  }
  return r
}

// 确保全部部分题目已拉取（结果页/查看记录渲染作答明细用）。
async function ensureAllParts(): Promise<void> {
  if (!state.meta) return
  for (const p of state.meta.parts) {
    await ensurePart(p.index)
  }
}

function openViewRecord(p: number): void { state.viewRecordPart = Number(p) }
function closeViewRecord(): void { state.viewRecordPart = null }

export const surveyStore = {
  state,
  progress,
  currentQuestion,
  quizInfo,
  partAllAnswered,
  displayName,
  init,
  loadMeta,
  loadProgress,
  ensurePart,
  ensureAllParts,
  register,
  login,
  logout,
  startChapter,
  enterChapter,
  choose,
  prevQuestion,
  gotoQuestion,
  firstUnanswered,
  discardSession,
  submitCurrentPart,
  submitAll,
  loadResult,
  openViewRecord,
  closeViewRecord,
}
