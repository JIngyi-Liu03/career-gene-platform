<template>
  <router-view />
  <Toast />
  <ConfirmDialog />
  <ViewRecordDialog />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import Toast from '@/components/Toast.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ViewRecordDialog from '@/components/ViewRecordDialog.vue'
import { surveyStore } from '@/stores/survey'

// 刷新页面后，若有有效 token 则恢复登录态并拉取进度。
onMounted(() => { surveyStore.init() })
</script>
