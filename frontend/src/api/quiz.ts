// 测评接口：元数据 / 拉题 / 提交部分 / 进度 / 全量提交 / 结果。
import { apiFetch } from './http'
import type { MetaResp, PartResponse, ProgressResp, SubmitPartResp, SurveyResult } from '@/types/quiz'

export function getMeta(): Promise<MetaResp> {
  return apiFetch<MetaResp>('quiz/meta')
}
export function getPart(i: number): Promise<PartResponse> {
  return apiFetch<PartResponse>('quiz/part/' + i)
}
export function submitPart(i: number, answers: number[]): Promise<SubmitPartResp> {
  return apiFetch<SubmitPartResp>('quiz/part/' + i, { method: 'POST', body: { answers } })
}
export function getProgress(): Promise<ProgressResp> {
  return apiFetch<ProgressResp>('quiz/progress')
}
export function submitAll(answers: number[]): Promise<{ ok: true; result: SurveyResult }> {
  return apiFetch<{ ok: true; result: SurveyResult }>('quiz/submit', { method: 'POST', body: { answers } })
}
export function getResult(): Promise<SurveyResult | null> {
  return apiFetch<SurveyResult | null>('quiz/result')
}
