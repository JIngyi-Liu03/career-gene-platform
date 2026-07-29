// 前后端共享的结果结构（前端仅消费，不计算）。
// 题库(Question) 已迁至后端，前端不再持有；题目以 QuestionDto 形态来自接口。

export type PartType = 'mbti' | 'disc' | 'pdp' | 'enneagram' | 'career'

// 后端返回的题目（已清洗，无算分键）。
export interface QuestionDto {
  index: number // 全局题号
  partIndex: number
  text: string
  options: string[]
}

export interface PartMeta {
  index: number
  title: string
  count: string
  intro: string
  hint: string
  qCount: number
}

export interface PartResponse {
  index: number
  title: string
  hint: string
  questions: QuestionDto[]
}

export interface RadarAxis {
  label: string
  rate: number
}

export interface MbtiPair {
  a: string
  b: string
  pa: number
  pb: number
}

export interface MbtiResult {
  type: string
  name: string
  desc: string
  pairs: MbtiPair[]
}

export interface SurveyResult {
  mbti: MbtiResult
  disc: RadarAxis[]
  pdp: RadarAxis[]
  ennea: RadarAxis[]
  career: RadarAxis[]
  answers?: Record<number, number> // 每题所选选项索引（稀疏），用于结果页回显答题记录
}

// —— API 响应类型 ——
export interface AuthResp {
  accessToken: string
  refreshToken: string
  name?: string
  doneParts?: boolean[]
}

export interface MetaResp {
  parts: PartMeta[]
}

export interface ProgressResp {
  assessmentId: number | null
  doneParts: boolean[]
  sparse: Record<number, number>
}

export interface SubmitPartResp {
  ok: true
  doneParts: boolean[]
}
