<template>
  <router-view />
  <AuthModal />
  <Toast />
  <ConfirmDialog />
  <ViewRecordDialog />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AuthModal from '@/components/AuthModal.vue'
import Toast from '@/components/Toast.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ViewRecordDialog from '@/components/ViewRecordDialog.vue'
import { surveyStore } from '@/stores/survey'
import { reportVisit } from '@/api/analytics'
import { getAccessToken } from '@/api/http'

// 从 accessToken 解析 userId（base64url）。
function decodeUserId(token: string): number | undefined {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(decodeURIComponent(escape(atob(b64))))
    return typeof payload.sub === 'number' ? payload.sub : undefined
  } catch {
    return undefined
  }
}

// 刷新页面后，若有有效 token 则恢复登录态并拉取进度；并每日上报一次访问。
onMounted(async () => {
  await surveyStore.init()
  const today = new Date().toISOString().slice(0, 10)
  if (localStorage.getItem('cg_visit_day') !== today) {
    const token = getAccessToken()
    const uid = token ? decodeUserId(token) : undefined
    await reportVisit(uid)
    localStorage.setItem('cg_visit_day', today)
  }
})
</script>
