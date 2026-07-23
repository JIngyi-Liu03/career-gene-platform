<template>
  <div class="auth-form">
    <h2 class="auth-title">登录</h2>
    <input
      class="nick"
      v-model="phone"
      placeholder="请输入手机号"
      maxlength="11"
      inputmode="numeric"
      @input="onPhoneInput"
      @keydown.enter="doLogin"
    />
    <p class="nick-err" v-if="errAt === 'phone'">{{ err }}</p>
    <input
      class="nick"
      v-model="password"
      type="password"
      placeholder="请输入密码"
      @keydown.enter="doLogin"
    />
    <p class="nick-err" v-if="errAt === 'password'">{{ err }}</p>
    <button class="btn-primary" :disabled="loading" @click="doLogin">
      {{ loading ? '登录中…' : '登 录' }}
    </button>
    <p class="auth-hint">开始探索</p>
    <div class="auth-links" style="justify-content:center">
      <a @click="emit('switch', 'register')">注册账号</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { surveyStore } from '@/stores/survey'
import { uiStore } from '@/stores/ui'
import type { AuthMode } from '@/stores/authModal'

const emit = defineEmits<{ success: []; switch: [mode: AuthMode] }>()

const phone = ref('')
const password = ref('')
const err = ref('')
const errAt = ref<'' | 'phone' | 'password'>('')
const loading = ref(false)

// 只允许数字，且 maxlength=11 已限制最多 11 位
function onPhoneInput(e: Event): void {
  const t = e.target as HTMLInputElement
  t.value = t.value.replace(/\D/g, '')
  phone.value = t.value
  err.value = ''
  errAt.value = ''
}

async function doLogin(): Promise<void> {
  err.value = ''
  errAt.value = ''
  if (phone.value.length !== 11) {
    err.value = '请输入正确的 11 位手机号'
    errAt.value = 'phone'
    return
  }
  if (!password.value) {
    err.value = '请输入密码'
    errAt.value = 'password'
    return
  }
  loading.value = true
  try {
    const ok = await surveyStore.login({ phone: phone.value, password: password.value })
    if (!ok) {
      err.value = '登录失败，请检查手机号与密码'
      errAt.value = 'password'
      return
    }
    uiStore.showToast('登录成功')
    emit('success')
  } catch (e: any) {
    err.value = e?.message || '登录失败'
    errAt.value = 'password'
  } finally {
    loading.value = false
  }
}
</script>
