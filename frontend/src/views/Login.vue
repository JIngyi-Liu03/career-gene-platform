<template>
  <div class="auth-card">
    <h2 class="auth-title">登录账号</h2>
    <p class="auth-sub">使用手机号 + 密码登录</p>

    <form class="auth-form" @submit.prevent="submit">
      <label class="field">
        <span>手机号</span>
        <input v-model.trim="phone" type="tel" inputmode="numeric" maxlength="11" placeholder="请输入注册手机号" />
      </label>
      <label class="field">
        <span>密码</span>
        <input v-model="password" type="password" placeholder="请输入密码（至少 6 位）" />
      </label>

      <div class="auth-row">
        <span></span>
        <button type="button" class="link" @click="$emit('switch', 'reset')">忘记密码？</button>
      </div>

      <button class="btn-primary" type="submit" :disabled="loading">
        {{ loading ? '登录中…' : '登录' }}
      </button>
    </form>

    <p class="auth-foot">
      还没有账号？
      <button type="button" class="link" @click="$emit('switch', 'register')">立即注册</button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { surveyStore } from '@/stores/survey'
import { uiStore } from '@/stores/ui'
import { isValidPhone } from '@/utils/validator'

const props = defineProps<{ phone?: string }>()
const emit = defineEmits<{ success: []; switch: [mode: 'login' | 'register' | 'reset'] }>()

const phone = ref(props.phone || '')
const password = ref('')
const loading = ref(false)

async function submit() {
  if (!isValidPhone(phone.value)) {
    uiStore.showToast('手机号格式有误')
    return
  }
  if (!password.value || password.value.length < 6) {
    uiStore.showToast('密码至少 6 位')
    return
  }
  loading.value = true
  try {
    const ok = await surveyStore.login({ phone: phone.value, password: password.value })
    if (ok) emit('success')
    else uiStore.showToast('登录失败，请重试')
  } catch (e: any) {
    uiStore.showToast(e?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
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
.auth-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.link { background: none; border: none; color: var(--blue); cursor: pointer; font-size: 13px; padding: 0; }
.link:hover { text-decoration: underline; }
.btn-primary {
  margin-top: 4px; height: 46px; border: none; border-radius: 10px; cursor: pointer;
  background: linear-gradient(135deg, var(--blue), var(--teal)); color: #fff;
  font-size: 15px; font-weight: 700; transition: opacity .2s, transform .1s;
}
.btn-primary:hover { opacity: .94; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.auth-foot { margin: 16px 0 0; text-align: center; color: var(--muted); font-size: 13px; }
</style>
