<template>
  <div id="chapter">
    <div class="chap-card" v-if="chapter">
      <div class="chap-title">{{ chapter.title }}</div>
      <div class="chap-count">{{ chapter.count }}</div>
      <div class="chap-intro">{{ chapter.intro }}</div>
      <button class="btn-primary" :disabled="loading" @click="enter">进 入</button>
      <p style="margin-top:16px;font-size:13px">
        <a href="javascript:void(0)" @click="back" style="color:var(--sub);cursor:pointer;text-decoration:underline">返回选择页</a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { surveyStore } from '@/stores/survey'

const router = useRouter()
const loading = ref(false)
const chapter = computed(() => {
  const p = surveyStore.state.currentPart
  return surveyStore.state.meta?.parts[p] || null
})

async function enter(): Promise<void> {
  loading.value = true
  try {
    await surveyStore.enterChapter()
    router.push('/quiz')
  } finally {
    loading.value = false
  }
}
function back(): void { router.push('/select') }
</script>
