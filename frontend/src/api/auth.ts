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

export function securityQuestions(): Promise<{ questions: string[] }> {
  return apiFetch<{ questions: string[] }>('auth/security-questions', { auth: false })
}

// —— 短信验证码相关（与后端 /auth/sms/* 对应）——

// 发送短信验证码：scene 区分注册 / 重置
export function sendSmsCode(
  phone: string,
  scene: 'register' | 'reset',
): Promise<{ ok: boolean; devCode?: string }> {
  return apiFetch<{ ok: boolean; devCode?: string }>('auth/sms/send', {
    method: 'POST',
    body: { phone, scene },
    auth: false,
  })
}

// 短信验证码注册：校验通过后写入令牌
export function registerWithSms(p: {
  phone: string
  name: string
  company?: string
  code: string
  password: string
}): Promise<{ accessToken: string; refreshToken: string; doneParts: boolean[] }> {
  return apiFetch<{ accessToken: string; refreshToken: string; doneParts: boolean[] }>('auth/sms/register', {
    method: 'POST',
    body: p,
    auth: false,
  }).then((d) => {
    setTokens(d.accessToken, d.refreshToken)
    return d
  })
}

// 短信验证码重置密码：仅更新密码，成功后需重新登录
export function resetPasswordWithSms(p: {
  phone: string
  code: string
  newPassword: string
}): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>('auth/sms/reset-password', {
    method: 'POST',
    body: p,
    auth: false,
  })
}
