<template>
  <div id="login">
    <div class="login-card">
      <h2>登录</h2>
      <p class="sub">使用注册时的手机号 + 密码登录。<br>如需继续作答或查看报告，必须使用同一手机号。</p>
      <input
        class="nick"
        v-model="phone"
        placeholder="请输入手机号（11 位）"
        maxlength="11"
        inputmode="numeric"
        @input="onPhoneInput"
        @keydown.enter="doLogin"
      />
      <input
        class="nick"
        v-model="password"
        type="password"
        placeholder="请输入密码"
        style="margin-top:12px"
        @keydown.enter="doLogin"
      />
      <p class="nick-err" v-if="err">{{ err }}</p>
      <button class="btn-primary" :disabled="loading" @click="doLogin">
        {{ loading ? '登录中…' : '登 陆' }}
      </button>
      <div class="login-links">
        <a href="javascript:void(0)" @click="goRegister">注册账号</a>
        <a href="javascript:void(0)" @click="goRecover">忘记密码？</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { surveyStore } from '@/stores/survey'
import { uiStore } from '@/stores/ui'

const router = useRouter()
const phone = ref('')
const password = ref('')
const err = ref('')
const loading = ref(false)

function onPhoneInput(e: Event): void {
  const t = e.target as HTMLInputElement
  t.value = t.value.replace(/\D/g, '')
  phone.value = t.value
  err.value = ''
}

async function doLogin(): Promise<void> {
  err.value = ''
  if (!phone.value) { err.value = '请输入手机号'; return }
  if (!password.value) { err.value = '请输入密码'; return }
  loading.value = true
  try {
    const ok = await surveyStore.login({ phone: phone.value, password: password.value })
    if (!ok) { err.value = '登录失败，请检查手机号与密码'; return }
    uiStore.showToast('登录成功')
    router.push('/select')
  } catch (e: any) {
    err.value = e?.message || '登录失败'
  } finally {
    loading.value = false
  }
}

function goRegister(): void { router.push('/register') }
function goRecover(): void { router.push('/recover') }
</script>

<style scoped>
.login-links { display: flex; justify-content: space-between; margin-top: 14px; font-size: 13px; }
.login-links a { color: var(--accent); cursor: pointer; }
</style>
