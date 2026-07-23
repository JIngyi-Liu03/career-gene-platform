// Admin 模块 DTO（手动校验，配合全局 ValidationPipe 的 whitelist 使用）。

export interface AdminLoginDto {
  username: string
  password: string
}

// 单题可编辑结构（含算分键，仅管理员可见）。
export interface AdminQuestionInput {
  type: string
  sec?: number | null
  text: string
  options: string[]
  m?: string[] | null // mbti/disc/enneagram/career 的算分键（与 options 等长）
  dim?: string | null // pdp 的维度（每题一个）
}

export interface UpdatePartBody {
  note: string // 修改说明（审计 + 版本备注）
  questions: AdminQuestionInput[]
}
