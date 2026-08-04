<template>
  <div id="login">
    <div class="login-wrap">
      <div class="login-card">
        <button class="back-home" type="button" @click="goHome">← 返回首页</button>

        <!-- 三合一：登录 / 注册 / 找回，子组件只提交，跳转收口在下方 -->
        <LoginForm
          v-if="mode === 'login'"
          :phone="prefillPhone"
          @success="onSuccess"
          @switch="onSwitch"
        />
        <RegisterForm
          v-else-if="mode === 'register'"
          @success="onSuccess"
          @switch="onSwitch"
        />
        <ResetPasswordForm
          v-else
          @success="onSuccess"
          @switch="onSwitch"
        />
      </div>
      <p class="login-foot">MentoringCo · 职场基因检测</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoginForm from '@/views/Login.vue'
import RegisterForm from '@/views/Register.vue'
import ResetPasswordForm from '@/views/ResetPassword.vue'

type AuthMode = 'login' | 'register' | 'reset'

const route = useRoute()
const router = useRouter()

// 初始 mode 可由 ?mode=register 指定（默认登录）
const mode = ref<AuthMode>((route.query.mode as AuthMode) || 'login')
// 找回密码成功后切回登录时，预填刚才的手机号
const prefillPhone = ref('')

function goHome(): void {
  router.push('/')
}

// 子组件只负责调接口（survey 层已写令牌+用户+恢复缓存），跳转统一在此收口
function onSuccess(): void {
  const r =
    typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/select'
  router.replace(r)
}

function onSwitch(m: AuthMode, phone?: string): void {
  if (m === 'login' && phone) prefillPhone.value = phone
  mode.value = m
}
</script>

<style scoped>
#login {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef3ff 0%, #e6fbf3 100%);
  padding: 24px;
  box-sizing: border-box;
}
.login-wrap {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.login-card {
  position: relative;
  width: 100%;
  background: #fff;
  border-radius: 18px;
  padding: 32px 28px 28px;
  box-shadow: 0 20px 50px rgba(37, 99, 235, 0.12);
  box-sizing: border-box;
}
.back-home {
  position: absolute;
  top: 16px;
  right: 18px;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}
.back-home:hover {
  color: var(--blue);
}
.login-foot {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}
</style>
