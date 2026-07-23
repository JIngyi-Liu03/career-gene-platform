// 通用小工具。

// 本地日期 → 'YYYY-MM-DD'（用于访问统计按天聚合）。
export function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
