<template>
  <transition name="modal-fade">
    <div v-if="authModal.state.open" class="modal-mask" @click.self="onMaskClick">
      <div class="modal-card">
        <button class="back-home" type="button" @click="goHome">返回首页</button>
        <h2 class="modal-title">{{ title }}</h2>

        <LoginForm
          v-if="authModal.state.mode === 'login'"
          :phone="authModal.state.prefillPhone"
          @success="onSuccess"
          @switch="onSwitch"
        />
        <RegisterForm
          v-else-if="authModal.state.mode === 'register'"
          @success="onSuccess"
          @switch="onSwitch"
        />
        <ResetPasswordForm
          v-else
          @success="onSuccess"
          @switch="onSwitch"
        />
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { authModal } from '@/stores/authModal'
import LoginForm from '@/views/Login.vue'
import RegisterForm from '@/views/Register.vue'
import ResetPasswordForm from '@/views/ResetPassword.vue'

const router = useRouter()

const title = computed(() => {
  if (authModal.state.mode === 'register') return '注册账号'
  if (authModal.state.mode === 'reset') return '找回密码'
  return '登录账号'
})

function goHome(): void {
  authModal.closeAuth()
  router.push('/')
}
function onMaskClick(): void {
  authModal.closeAuth()
}
// 子组件只负责调接口（survey 层已写令牌+用户+恢复缓存），跳转统一在此收口
function onSuccess(): void {
  const r = authModal.state.redirect || '/select'
  authModal.closeAuth()
  router.replace(r)
}
function onSwitch(mode: 'login' | 'register' | 'reset', phone?: string): void {
  authModal.setMode(mode, phone)
}
</script>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}
.modal-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 18px;
  padding: 28px 26px 26px;
  box-shadow: 0 24px 60px rgba(37, 99, 235, 0.18);
  box-sizing: border-box;
}
.back-home {
  position: absolute;
  top: 16px;
  right: 18px;
  background: none;
  border: none;
  color: var(--blue);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}
.back-home:hover {
  color: var(--blue);
}
.modal-title {
  margin: 0 0 18px;
  text-align: center;
  font-size: 22px;
  color: var(--ink);
  font-weight: 800;
}
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
