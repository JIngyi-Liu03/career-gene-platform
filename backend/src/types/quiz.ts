// 后端共享类型：与前端 types/quiz.ts 的"结果结构"保持一致（前端仅消费，不计算）。
// 题库(QuestionBank) 仅在后端使用，绝不外泄 m/dim 等算分键。

export type PartType = 'mbti' | 'disc' | 'pdp' | 'enneagram' | 'career'

// 题库内部题目结构（含算分键 m/dim，绝不进 API 响应）。
export interface QuestionBank {
  type: PartType
  sec?: number
  dim?: string
  text: string
  a: string[]
  m?: string[]
}

// 对外暴露的题目（已清洗，无算分键）。
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
}

// 后端算分函数统一产出（分类别），便于按 part 增量保存。
export type CategoryKey = PartType
