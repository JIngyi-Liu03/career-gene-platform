<template>
  <form class="auth-form" @submit.prevent="submit">
    <label class="field">
      <span>手机号</span>
      <input v-model.trim="phone" type="tel" inputmode="numeric" maxlength="11" placeholder="请输入手机号" />
    </label>
    <label class="field">
      <span>密码</span>
      <input v-model="password" type="password" placeholder="请输入密码" />
    </label>

    <button class="btn-primary" type="submit" :disabled="loading">
      {{ loading ? '登录中…' : '登录' }}
    </button>

    <p class="auth-foot">
      <button type="button" class="link" @click="$emit('switch', 'reset')">忘记密码？</button>
      <span class="sep">|</span>
      <button type="button" class="link" @click="$emit('switch', 'register')">没有账号？去注册</button>
    </p>
  </form>
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
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--ink); }
.field input {
  height: 44px; padding: 0 14px; border-radius: 10px;
  border: 1px solid var(--line); background: #fff; color: var(--ink); font-size: 15px;
  outline: none; transition: border-color .2s, box-shadow .2s;
}
.field input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
.btn-primary {
  margin-top: 4px; height: 46px; border: none; border-radius: 10px; cursor: pointer;
  background: linear-gradient(135deg, var(--blue), var(--teal)); color: #fff;
  font-size: 15px; font-weight: 700; transition: opacity .2s, transform .1s;
}
.btn-primary:hover { opacity: .94; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.auth-foot {
  margin: 14px 0 0; display: flex; justify-content: center; align-items: center;
  gap: 10px; color: var(--muted); font-size: 13px;
}
.sep { color: var(--line); }
.link { background: none; border: none; color: var(--blue); cursor: pointer; font-size: 13px; padding: 0; }
.link:hover { text-decoration: underline; }
</style>
