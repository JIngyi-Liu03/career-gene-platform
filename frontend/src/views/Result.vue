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
        <div style="font-size:13px;color:#5b6b80;margin-top:14px;">各维度占比（按百分比降序）：</div>
        <div class="mbti-bars">
          <div
            v-for="(it, i) in mbtiLetters"
            :key="i"
            style="display:flex;align-items:center;gap:10px;margin:6px 0;font-size:13px;"
          >
            <span style="min-width:96px;flex:none;font-weight:700;color:#1f2a44;white-space:nowrap">{{ it.label }}</span>
            <div style="flex:1;height:12px;background:#eef1f6;border-radius:6px;overflow:hidden">
              <div :style="{ width: it.rate + '%', height: '100%', background: '#3b6ef0' }"></div>
            </div>
            <span style="width:42px;text-align:right;font-weight:700;color:#5b6b80">{{ it.rate }}%</span>
          </div>
        </div>
      </div>

      <ResultCard title="DISC · 行为与沟通风格（按占比降序）" :axes="discA" color="#e4572e" />
      <ResultCard title="PDP · 能量特质与气场（按占比降序）" :axes="pdpA" color="#3b6ef0" />
      <ResultCard title="九型 · 核心动机与注意力焦点（按占比降序）" :axes="enneaA" color="#10b3a3" />
      <CareerCard :axes="careerA" color="#8b5cf6" />

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

      <div class="result-actions no-print" style="margin-top:8px">
        <button class="text-btn" @click="back">返回选择页</button>
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
import { mapAxisLabels, mapMbtiLetter } from '@/utils/labels'
import type { SurveyResult, RadarAxis } from '@/types/quiz'

const router = useRouter()
const loading = ref(false)
const result = computed<SurveyResult | null>(() => surveyStore.state.result)

// 维度按百分比从大到小排序（参考要求：测试结果按百分比降序排列维度）。
function sortAxes(axes?: RadarAxis[]): RadarAxis[] {
  if (!axes) return []
  return [...axes].sort((a, b) => b.rate - a.rate)
}
const discA = computed(() => sortAxes(mapAxisLabels(result.value?.disc, 'disc')))
const pdpA = computed(() => sortAxes(mapAxisLabels(result.value?.pdp, 'pdp')))
const enneaA = computed(() => sortAxes(mapAxisLabels(result.value?.ennea, 'ennea')))
const careerA = computed(() => sortAxes(mapAxisLabels(result.value?.career, 'career')))
// MBTI 八个字母（各维度两个极性）按占比降序排列，并映射为中文文字
const mbtiLetters = computed(() => {
  const ps = result.value?.mbti.pairs || []
  const list: { label: string; rate: number }[] = []
  for (const p of ps) {
    list.push({ label: mapMbtiLetter(p.a), rate: p.pa })
    list.push({ label: mapMbtiLetter(p.b), rate: p.pb })
  }
  return list.sort((a, b) => b.rate - a.rate)
})

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
  const done = surveyStore.state.doneParts
  if (!done.every(Boolean)) { router.replace('/select'); return }
  loading.value = true
  try {
    await surveyStore.ensureAllParts()
    let r = surveyStore.state.result
    if (!r) r = await surveyStore.loadResult()
    if (!r) r = await surveyStore.submitAll()
    if (!r) { uiStore.showToast('暂无结果数据'); router.replace('/select') }
  } finally {
    loading.value = false
  }
})

function back(): void { router.push('/select') }
</script>

<style scoped>
.loading-tip { text-align: center; color: var(--sub); padding: 40px 0; }
.text-btn {
  background: none;
  border: none;
  padding: 6px 0;
  color: var(--accent);
  font-size: 14px;
  cursor: pointer;
}
.text-btn:hover { text-decoration: underline; }
</style>
