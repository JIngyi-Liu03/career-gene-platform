import { apiFetch } from './http'

// 上报站点访问（免强鉴权；登录态下附带 userId 用于关联统计）。
export async function reportVisit(userId?: number): Promise<void> {
  try {
    await apiFetch('analytics/visit', {
      method: 'POST',
      body: typeof userId === 'number' ? { userId } : {},
    })
  } catch {
    // 上报失败不影响主流程
  }
}
