// 鉴权接口：注册 / 登录 / 找回密码 / 安全问题列表。
import { apiFetch, setTokens } from './http'
import type { AuthResp } from '@/types/quiz'

export function register(input: {
  name: string; phone: string; password: string; securityQuestion: string; securityAnswer: string
}): Promise<AuthResp> {
  return apiFetch<AuthResp>('auth/register', { method: 'POST', body: input }).then((d) => {
    setTokens(d.accessToken, d.refreshToken)
    return d
  })
}

export function login(input: { phone: string; password: string }): Promise<AuthResp> {
  return apiFetch<AuthResp>('auth/login', { method: 'POST', body: input }).then((d) => {
    setTokens(d.accessToken, d.refreshToken)
    return d
  })
}

export function recover(input: {
  phone: string; name: string; securityQuestion: string; securityAnswer: string; newPassword: string
}): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>('auth/recover', { method: 'POST', body: input })
}

export function securityQuestions(): Promise<{ questions: string[] }> {
  return apiFetch<{ questions: string[] }>('auth/security-questions', { auth: false })
}
