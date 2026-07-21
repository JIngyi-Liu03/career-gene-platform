// 表单校验：手机号 + 姓名 + 密码强度（最小 6 位）。
export function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone || '')
}

export function isValidName(name: string): boolean {
  return !!(name && name.trim())
}

export function isValidPassword(pw: string): boolean {
  return !!(pw && pw.length >= 6)
}
