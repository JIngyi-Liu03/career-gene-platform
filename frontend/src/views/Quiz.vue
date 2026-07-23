<template>
  <div id="quiz">
    <ProgressBar
      v-if="quizInfo"
      :percent="quizInfo.percent"
      :text="quizInfo.title + ' · 第 ' + (quizInfo.localIdx + 1) + ' / ' + quizInfo.size + ' 题'"
    />
    <QuestionCard
      v-if="question"
      :question="question"
      :chosen="chosen"
      :canPrev="quizInfo ? quizInfo.canPrev : false"
      :hint="hint"
      @choose="onChoose"
      @prev="onPrev"
      @back="onBack"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ProgressBar from '@/components/ProgressBar.vue'
import QuestionCard from '@/components/QuestionCard.vue'
import { surveyStore } from '@/stores/survey'
import { uiStore } from '@/stores/ui'

const router = useRouter()
const transitioning = ref(false)

const question = surveyStore.currentQuestion
const quizInfo = surveyStore.quizInfo
const chosen = computed<number | null>(() => {
  const info = quizInfo.value
  if (!info || !surveyStore.state.sessionAnswers) return null
  return surveyStore.state.sessionAnswers[info.localIdx]
})
const hint = computed(() => {
  const sp = surveyStore.state.sessionPart
  return sp >= 0 ? (surveyStore.state.meta?.parts[sp]?.hint || '') : ''
})

async function onChoose(oi: number): Promise<void> {
  if (transitioning.value) return
  transitioning.value = true
  const finished = surveyStore.choose(oi)
  if (finished) {
    if (!surveyStore.partAllAnswered.value) {
      // 未全部作答：不提交，跳到第一道未答题让用户补齐。
      surveyStore.gotoQuestion(surveyStore.firstUnanswered())
      uiStore.showToast('请完成全部题目后再提交')
      transitioning.value = false
      return
    }
    try {
      await surveyStore.submitCurrentPart()
      uiStore.showToast('本部分已保存')
    } catch (e: any) {
      uiStore.showToast(e?.message || '提交失败，请检查网络')
    }
    router.push('/select')
    return
  }
  setTimeout(() => { transitioning.value = false }, 200)
}
function onPrev(): void { surveyStore.prevQuestion() }
function onBack(): void {
  if (surveyStore.state.sessionPart >= 0) {
    uiStore.showConfirm('当前部分正在作答中，中途退出则本次测试不做记录。确定要退出吗？', () => {
      surveyStore.discardSession()
      router.push('/select')
    })
  } else {
    router.push('/select')
  }
}

onMounted(() => {
  if (surveyStore.state.sessionPart < 0) router.replace('/select')
})
</script>
