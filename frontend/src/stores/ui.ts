// 轻量 UI 状态：提示 toast 与确认弹窗（原 index.html 中 #toast / #custom-confirm 的 Vue 化）。
import { reactive } from 'vue'

const state = reactive({
  toast: { msg: '', show: false },
  confirm: { msg: '', show: false, onOk: null as (() => void) | null, onCancel: null as (() => void) | null },
})

let toastTimer: any = null
function showToast(msg: string, duration = 2200): void {
  state.toast.msg = msg
  state.toast.show = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { state.toast.show = false }, duration)
}

function showConfirm(msg: string, onOk: () => void, onCancel?: () => void): void {
  state.confirm.msg = msg
  state.confirm.onOk = onOk
  state.confirm.onCancel = onCancel || null
  state.confirm.show = true
}

function closeConfirm(ok: boolean): void {
  state.confirm.show = false
  const cb = ok ? state.confirm.onOk : state.confirm.onCancel
  state.confirm.onOk = null
  state.confirm.onCancel = null
  if (cb) cb()
}

export const uiStore = { state, showToast, showConfirm, closeConfirm }
