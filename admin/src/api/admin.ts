import { apiFetch } from './http'

export interface UserRow {
  id: number
  phone: string
  name: string
  company: string | null
  registeredAt: string
  doneParts: boolean[]
  answeredCount: number
  total: number
  completion: number
  allCompleted: boolean
}

export interface UserResult {
  user: { name: string; phone: string; company: string | null }
  result: {
    mbti: any
    disc: Array<{ label: string; rate: number }>
    pdp: Array<{ label: string; rate: number }>
    ennea: Array<{ label: string; rate: number }>
    career: Array<{ label: string; rate: number }>
  }
}

export interface StatsResp {
  registered: number
  partLabels: string[]
  partDoneCounts: number[]
  allCompleted: number
}

export interface VisitPoint {
  day: string
  count: number
}

export function adminLogin(username: string, password: string) {
  return apiFetch<{ accessToken: string; username: string }>('admin/login', {
    method: 'POST',
    body: { username, password },
  })
}

export function getStats() {
  return apiFetch<StatsResp>('admin/stats')
}

export function getUsers() {
  return apiFetch<UserRow[]>('admin/users')
}

export function getUserResult(userId: number) {
  return apiFetch<UserResult>(`admin/users/${userId}/result`)
}

export interface ExportResp {
  downloadUrl: string
  uuid: string
}

export function requestExport(format: 'excel' | 'word', includeResults: boolean, userIds?: number[]): Promise<ExportResp> {
  const params = new URLSearchParams()
  params.set('format', format)
  params.set('includeResults', String(includeResults))
  if (userIds && userIds.length) params.set('userIds', userIds.join(','))
  return apiFetch<ExportResp>(`admin/export?${params.toString()}`)
}

export function deleteExport(uuid: string) {
  return apiFetch<{ ok: true }>(`admin/export/${uuid}`, { method: 'DELETE' })
}

export function getVisits(days: number) {
  return apiFetch<VisitPoint[]>('admin/visits?days=' + days)
}
