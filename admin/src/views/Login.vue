<template>
  <div class="login-wrap">
    <form class="login-card" @submit.prevent="onLogin">
      <h1>管理后台登录</h1>
      <p class="sub">仅限管理员访问 · 错误尝试将触发限流</p>
      <input v-model="username" placeholder="管理员账号" autocomplete="username" />
      <input
        v-model="password"
        type="password"
        placeholder="密码"
        autocomplete="current-password"
      />
      <button type="submit" :disabled="loading">{{ loading ? '登录中…' : '登录' }}</button>
      <p class="err" v-if="err">{{ err }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminLogin } from '@/api/admin'
import { hasToken, setToken } from '@/api/http'

const router = useRouter()
const username = ref('admin')
const password = ref('')
const loading = ref(false)
const err = ref('')

if (hasToken()) router.replace('/')

async function onLogin() {
  loading.value = true
  err.value = ''
  try {
    const r = await adminLogin(username.value, password.value)
    setToken(r.accessToken)
    router.replace('/')
  } catch (e: any) {
    err.value = e?.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>
