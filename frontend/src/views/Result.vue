<template>
  <div id="result">
    <div class="result-head"><h2>🎯 你的职场基因画像</h2></div>

    <div v-if="loading" class="loading-tip">正在生成报告…</div>

    <template v-if="result">
      <!-- MBTI -->
      <div style="background:transparent;border:none;box-shadow:none;border-radius:0;padding:8px 0;margin-bottom:16px;">
        <div class="type-box">
          <div class="big">{{ result.mbti.type }}</div>
          <div class="nm">{{ result.mbti.name }}</div>
          <div class="ds">{{ result.mbti.desc }}</div>
        </div>
        <div style="font-size:13px;color:#5b6b80;margin-top:14px;">各维度占比：</div>
        <div class="bars">
          <div class="pair" v-for="(pr, idx) in result.mbti.pairs" :key="idx">
            <div class="pair-head">
              <span style="color:#3b6ef0;font-weight:700">{{ mapMbtiPair(pr).a }} {{ pr.pa }}%</span>
              <span style="color:#f3a712;font-weight:700">{{ mapMbtiPair(pr).b }} {{ pr.pb }}%</span>
            </div>
            <div class="pair-track">
              <div class="bar-fill" :style="{ background: '#3b6ef0', width: pr.pa + '%' }"></div>
              <div class="bar-fill" :style="{ background: '#f3a712', width: pr.pb + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <ResultCard title="DISC · 行为与沟通风格" :axes="mappedDisc" color="#e4572e" />
      <ResultCard title="PDP · 能量特质与气场" :axes="mappedPdp" color="#3b6ef0" />
      <ResultCard title="九型 · 核心动机与注意力焦点" :axes="mappedEnnea" color="#10b3a3" />
      <CareerCard :axes="mappedCareer" color="#8b5cf6" />

      <!-- 答题记录 -->
      <div class="answer-record">
        <h3 class="ar-title">📋 答题记录</h3>
        <div class="ar-list">
          <div class="ar-row" v-for="(q, i) in allQuestions" :key="i">
            <div class="ar-q-wrap">
              <span class="ar-no">{{ i + 1 }}.</span>
              <span class="ar-q">{{ q.text }}</span>
              <div class="ar-opts">
                <div
                  class="ar-opt"
                  :class="{ 'ar-chosen': q.chosen === oi2 }"
                  v-for="(opt, oi2) in q.options"
                  :key="oi2"
                >
                  <span class="ar-opt-marker">{{ q.chosen === oi2 ? '✓' : '' }}</span>
                  <span class="ar-opt-text">{{ opt }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="result-actions no-print" style="display:flex;justify-content:center;margin-top:8px">
        <button class="back-link" @click="back">返回选择页</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ResultCard from '@/components/ResultCard.vue'
import CareerCard from '@/components/CareerCard.vue'
import { surveyStore } from '@/stores/survey'
import { uiStore } from '@/stores/ui'
import { mapAxisLabels, mapMbtiPair } from '@/utils/labels'
import type { SurveyResult, RadarAxis } from '@/types/quiz'

const router = useRouter()
const loading = ref(false)
const result = computed<SurveyResult | null>(() => surveyStore.state.result)

const mappedDisc = computed<RadarAxis[]>(() => mapAxisLabels(result.value?.disc as RadarAxis[], 'disc'))
const mappedPdp = computed<RadarAxis[]>(() => mapAxisLabels(result.value?.pdp as RadarAxis[], 'pdp'))
const mappedEnnea = computed<RadarAxis[]>(() => mapAxisLabels(result.value?.ennea as RadarAxis[], 'ennea'))
const mappedCareer = computed<RadarAxis[]>(() => mapAxisLabels(result.value?.career as RadarAxis[], 'career'))

const allQuestions = computed(() => {
  const arr: { text: string; options: string[]; chosen: number | null }[] = []
  const parts = surveyStore.state.meta?.parts || []
  for (const p of parts) {
    const qs = surveyStore.state.partsCache[p.index] || []
    for (const q of qs) {
      arr.push({ text: q.text, options: q.options, chosen: surveyStore.state.answers[q.index] })
    }
  }
  return arr
})

onMounted(async () => {
  loading.value = true
  try {
    // 先确保题目已拉取，再从后端取结果（历史/刷新进入时本地缓存为空也能回填答题记录）。
    await surveyStore.ensureAllParts()
    let r = surveyStore.state.result
    if (!r) r = await surveyStore.loadResult()
    if (!r) r = await surveyStore.submitAll()
    if (r) return // 已拿到结果，直接渲染
    // 兜底：确实没有结果才回选择页。
    const done = surveyStore.state.doneParts
    if (!done.every(Boolean)) { router.replace('/select'); return }
    uiStore.showToast('暂无结果数据')
    router.replace('/select')
  } finally {
    loading.value = false
  }
})

function back(): void { router.push('/select') }
</script>

<style scoped>
.loading-tip { text-align: center; color: var(--sub); padding: 40px 0; }

.back-link {
  background: none;
  border: none;
  border-bottom: 1.5px solid var(--accent);
  color: var(--accent);
  font-size: 15px;
  font-weight: 500;
  padding: 4px 2px;
  cursor: pointer;
}
.back-link:hover { opacity: 0.75; }
</style>
