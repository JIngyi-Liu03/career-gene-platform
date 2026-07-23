// 登录弹窗状态：仅管理「是否打开」与「当前模式」，与 UI 的 toast/confirm 分开，避免代码混用。
import { reactive } from 'vue'

export type AuthMode = 'login' | 'register'

const state = reactive({
  open: false,
  mode: 'login' as AuthMode,
})

function openAuth(mode: AuthMode = 'login'): void {
  state.mode = mode
  state.open = true
}
function closeAuth(): void {
  state.open = false
}
function switchMode(mode: AuthMode): void {
  state.mode = mode
}

export const authModal = { state, openAuth, closeAuth, switchMode }
