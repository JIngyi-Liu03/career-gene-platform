import { apiFetch } from './http'

export interface AdminQuestion {
  type: string
  sec?: number | null
  text: string
  options: string[]
  m?: string[] | null
  dim?: string | null
}

export interface BankPart {
  index: number
  type: string
  label: string
  dimensions: string[]
  scoringNote: string
  questions: AdminQuestion[]
}

export interface BankVersion {
  version: number
  note: string | null
  operator: string
  createdAt: string
}

export interface UserRow {
  id: number
  phone: string
  name: string
  registeredAt: string
  doneParts: boolean[]
  answeredCount: number
  total: number
  completion: number
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

export function getBank() {
  return apiFetch<{ currentVersion: number | null; parts: BankPart[] }>('admin/quiz')
}

export function updatePart(i: number, payload: { note: string; questions: AdminQuestion[] }) {
  return apiFetch<{ ok: true; version: number }>(`admin/quiz/part/${i}`, {
    method: 'PUT',
    body: payload,
  })
}

export function getVersions() {
  return apiFetch<BankVersion[]>('admin/versions')
}

export function rollback(version: number) {
  return apiFetch<{ ok: true; version: number }>(`admin/quiz/rollback/${version}`, {
    method: 'POST',
  })
}

export function getStats() {
  return apiFetch<StatsResp>('admin/stats')
}

export function getUsers() {
  return apiFetch<UserRow[]>('admin/users')
}

export function getVisits(days: number) {
  return apiFetch<VisitPoint[]>('admin/visits?days=' + days)
}
