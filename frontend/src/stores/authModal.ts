// 登录/注册/找回 弹窗的全局状态（手动 reactive 单例，与 ui.ts / survey.ts 同模式，不依赖 Pinia）。
import { reactive } from 'vue'

export type AuthMode = 'login' | 'register' | 'reset'

const state = reactive({
  open: false,
  mode: 'login' as AuthMode,
  redirect: '' as string,
  prefillPhone: '' as string,
})

function openAuth(mode: AuthMode = 'login', redirect = ''): void {
  state.mode = mode
  state.redirect = redirect
  state.prefillPhone = ''
  state.open = true
}
function closeAuth(): void {
  state.open = false
}
function setMode(mode: AuthMode, phone = ''): void {
  state.mode = mode
  if (phone) state.prefillPhone = phone
}

export const authModal = { state, openAuth, closeAuth, setMode }
