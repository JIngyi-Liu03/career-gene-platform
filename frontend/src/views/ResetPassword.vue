<template>
  <div class="auth-card">
    <h2 class="auth-title">找回密码</h2>
    <p class="auth-sub">通过手机号 + 短信验证码重置密码</p>

    <form class="auth-form" @submit.prevent="submit">
      <label class="field">
        <span>手机号</span>
        <div class="phone-line">
          <input v-model.trim="phone" type="tel" inputmode="numeric" maxlength="11" placeholder="请输入注册手机号" :disabled="sent" />
          <button type="button" class="code-btn" :disabled="cooldown > 0 || sending" @click="sendCode">
            {{ cooldown > 0 ? cooldown + 's 后重发' : '获取验证码' }}
          </button>
        </div>
      </label>

      <p v-if="devCode" class="dev-tip">演示验证码：<b>{{ devCode }}</b>（生产环境将通过短信发送）</p>

      <template v-if="sent">
        <label class="field">
          <span>短信验证码</span>
          <input v-model.trim="code" type="text" inputmode="numeric" maxlength="6" placeholder="请输入 6 位验证码" />
        </label>
        <label class="field">
          <span>新密码</span>
          <input v-model="password" type="password" placeholder="至少 6 位" />
        </label>
        <label class="field">
          <span>确认新密码</span>
          <input v-model="confirm" type="password" placeholder="再次输入密码" />
        </label>
      </template>

      <button class="btn-primary" type="submit" :disabled="loading || !sent">
        {{ loading ? '重置中…' : '重置密码' }}
      </button>
    </form>

    <p class="auth-foot">
      <button type="button" class="link" @click="$emit('switch', 'login')">返回登录</button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { surveyStore } from '@/stores/survey'
import { uiStore } from '@/stores/ui'
import { sendSmsCode } from '@/api/auth'
import { isValidPhone, isValidPassword } from '@/utils/validator'

const emit = defineEmits<{ success: []; switch: [mode: 'login' | 'register' | 'reset', phone?: string] }>()

const phone = ref('')
const code = ref('')
const password = ref('')
const confirm = ref('')
const sent = ref(false)
const devCode = ref('')
const sending = ref(false)
const loading = ref(false)
const cooldown = ref(0)
let timer: number | undefined

function startCooldown() {
  cooldown.value = 60
  timer = window.setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }, 1000)
}

async function sendCode() {
  if (!isValidPhone(phone.value)) {
    uiStore.showToast('手机号格式有误')
    return
  }
  if (cooldown.value > 0) return
  sending.value = true
  try {
    const res = await sendSmsCode(phone.value, 'reset')
    if (res.devCode) devCode.value = res.devCode
    sent.value = true
    startCooldown()
    uiStore.showToast('验证码已发送，请查收')
  } catch (e: any) {
    uiStore.showToast(e?.message || '验证码发送失败')
  } finally {
    sending.value = false
  }
}

async function submit() {
  if (!isValidPhone(phone.value)) {
    uiStore.showToast('手机号格式有误')
    return
  }
  if (!sent.value) {
    uiStore.showToast('请先获取短信验证码')
    return
  }
  if (!code.value) {
    uiStore.showToast('请输入验证码')
    return
  }
  if (!isValidPassword(password.value)) {
    uiStore.showToast('新密码至少 6 位')
    return
  }
  if (password.value !== confirm.value) {
    uiStore.showToast('两次输入的密码不一致')
    return
  }
  loading.value = true
  try {
    const ok = await surveyStore.resetPassword({
      phone: phone.value,
      code: code.value,
      newPassword: password.value,
    })
    if (ok) {
      uiStore.showToast('密码已重置，请用新密码登录')
      emit('switch', 'login', phone.value)
    } else {
      uiStore.showToast('重置失败，请重试')
    }
  } catch (e: any) {
    uiStore.showToast(e?.message || '重置失败')
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.auth-card { padding: 4px 4px 8px; }
.auth-title { margin: 0 0 6px; font-size: 22px; color: var(--ink); font-weight: 800; }
.auth-sub { margin: 0 0 18px; color: var(--muted); font-size: 13px; }
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--ink); }
.field input {
  height: 44px; padding: 0 14px; border-radius: 10px;
  border: 1px solid var(--line); background: #fff; color: var(--ink); font-size: 15px;
  outline: none; transition: border-color .2s, box-shadow .2s;
}
.field input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
.phone-line { display: flex; gap: 8px; }
.phone-line input { flex: 1; }
.code-btn {
  flex: 0 0 auto; padding: 0 14px; border-radius: 10px; border: 1px solid var(--blue);
  color: var(--blue); background: #fff; cursor: pointer; font-size: 13px; white-space: nowrap;
}
.code-btn:disabled { opacity: .55; cursor: not-allowed; }
.dev-tip { margin: -6px 0 0; font-size: 12px; color: var(--teal); }
.dev-tip b { letter-spacing: 2px; }
.btn-primary {
  margin-top: 4px; height: 46px; border: none; border-radius: 10px; cursor: pointer;
  background: linear-gradient(135deg, var(--blue), var(--teal)); color: #fff;
  font-size: 15px; font-weight: 700; transition: opacity .2s, transform .1s;
}
.btn-primary:hover { opacity: .94; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.auth-foot { margin: 16px 0 0; text-align: center; color: var(--muted); font-size: 13px; }
.link { background: none; border: none; color: var(--blue); cursor: pointer; font-size: 13px; padding: 0; }
.link:hover { text-decoration: underline; }
</style>
