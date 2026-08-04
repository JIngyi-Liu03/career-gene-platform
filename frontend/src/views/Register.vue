<template>
  <form class="auth-form" @submit.prevent="submit">
    <label class="field">
      <span>姓名</span>
      <input v-model.trim="name" type="text" maxlength="20" placeholder="请输入姓名" />
    </label>
    <label class="field">
      <span>手机号</span>
      <input v-model.trim="phone" type="tel" inputmode="numeric" maxlength="11" placeholder="请输入手机号" />
    </label>
    <label class="field">
      <span>验证码</span>
      <div class="code-row">
        <input v-model.trim="code" inputmode="numeric" maxlength="6" placeholder="请输入验证码" />
        <button type="button" class="code-btn" :disabled="countdown > 0" @click="sendCode">
          {{ countdown > 0 ? countdown + 's' : '获取验证码' }}
        </button>
      </div>
    </label>
    <label class="field">
      <span>密码</span>
      <input v-model="password" type="password" placeholder="请输入密码（至少 6 位）" />
    </label>
    <label class="field">
      <span>确认密码</span>
      <input v-model="confirm" type="password" placeholder="请再次输入密码" />
    </label>

    <button class="btn-primary" type="submit" :disabled="loading">
      {{ loading ? '注册中…' : '注册' }}
    </button>

    <p class="auth-foot">
      <button type="button" class="link" @click="$emit('switch', 'login')">已有账号？去登录</button>
    </p>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { surveyStore } from '@/stores/survey'
import { uiStore } from '@/stores/ui'
import { sendSmsCode } from '@/api/auth'
import { isValidPhone, isValidName } from '@/utils/validator'

const emit = defineEmits<{ success: []; switch: [mode: 'login' | 'register' | 'reset'] }>()

const phone = ref('')
const name = ref('')
const code = ref('')
const password = ref('')
const confirm = ref('')
const sentCode = ref('')
const loading = ref(false)
const countdown = ref(0)
let timer: any = null

async function sendCode() {
  if (countdown.value > 0) return
  if (!isValidPhone(phone.value)) {
    uiStore.showToast('手机号格式有误')
    return
  }
  loading.value = true
  try {
    const r = await sendSmsCode(phone.value, 'register')
    sentCode.value = r.devCode || ''
    if (r.devCode) uiStore.showToast(`演示验证码：${r.devCode}（生产环境将真实下发）`)
    else uiStore.showToast('验证码已发送')
    countdown.value = 60
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && timer) {
        clearInterval(timer)
        timer = null
      }
    }, 1000)
  } catch (e: any) {
    uiStore.showToast(e?.message || '发送失败')
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!isValidPhone(phone.value)) {
    uiStore.showToast('手机号格式有误')
    return
  }
  if (!isValidName(name.value)) {
    uiStore.showToast('请输入姓名')
    return
  }
  if (!code.value) {
    uiStore.showToast('请输入验证码')
    return
  }
  if (password.value.length < 6) {
    uiStore.showToast('密码至少 6 位')
    return
  }
  if (password.value !== confirm.value) {
    uiStore.showToast('两次密码不一致')
    return
  }
  loading.value = true
  try {
    const ok = await surveyStore.register({
      phone: phone.value,
      name: name.value,
      code: code.value,
      password: password.value,
    })
    if (ok) emit('success')
    else uiStore.showToast('注册失败，请重试')
  } catch (e: any) {
    uiStore.showToast(e?.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--ink); }
.field input {
  height: 44px; padding: 0 14px; border-radius: 10px;
  border: 1px solid var(--line); background: #fff; color: var(--ink); font-size: 15px;
  outline: none; transition: border-color .2s, box-shadow .2s;
}
.field input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
.code-row { display: flex; gap: 10px; }
.code-row input { flex: 1; }
.code-btn {
  white-space: nowrap; height: 44px; padding: 0 14px; border-radius: 10px;
  border: 1px solid var(--line); background: #fff; color: var(--blue); font-size: 13px; cursor: pointer;
}
.code-btn:disabled { color: var(--muted); cursor: not-allowed; }
.btn-primary {
  margin-top: 4px; height: 46px; border: none; border-radius: 10px; cursor: pointer;
  background: linear-gradient(135deg, var(--blue), var(--teal)); color: #fff;
  font-size: 15px; font-weight: 700; transition: opacity .2s, transform .1s;
}
.btn-primary:hover { opacity: .94; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.auth-foot { margin: 14px 0 0; text-align: center; }
.link { background: none; border: none; color: var(--blue); cursor: pointer; font-size: 13px; padding: 0; }
.link:hover { text-decoration: underline; }
</style>
