<template>
  <div v-if="authModal.state.open" class="auth-overlay" @click.self="authModal.closeAuth()">
    <div class="auth-panel">
      <button class="auth-close" type="button" @click="authModal.closeAuth()" aria-label="关闭">×</button>
      <LoginForm v-if="authModal.state.mode === 'login'" @success="onSuccess" @switch="authModal.switchMode" />
      <RegisterForm v-else @success="onSuccess" @switch="authModal.switchMode" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { authModal } from '@/stores/authModal'
import LoginForm from '@/views/Login.vue'
import RegisterForm from '@/views/Register.vue'

const router = useRouter()

// 登录 / 注册成功：关闭弹窗并进入选择页
function onSuccess(): void {
  authModal.closeAuth()
  router.push('/select')
}
</script>
