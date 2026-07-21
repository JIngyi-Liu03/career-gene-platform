<template>
  <div
    id="view-record"
    :style="{ display: part !== null ? 'flex' : 'none' }"
    style="position:fixed;inset:0;background:rgba(15,22,38,.55);z-index:99998;align-items:center;justify-content:center;-webkit-overflow-scrolling:touch;touch-action:none"
  >
    <div
      id="vr-box"
      style="background:#fff;border-radius:18px;max-width:680px;width:94vw;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(31,42,68,.30);overflow:hidden;"
    >
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--line);flex:none;">
        <div id="vr-title" style="font-size:17px;font-weight:800;color:#1f2a44">{{ title }}</div>
        <button @click="close" style="border:none;background:#eef1f6;color:#5b6b80;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;flex:none">✕</button>
      </div>
      <div id="vr-body" style="padding:18px 20px;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:auto;">
        <template v-if="part === 0 && result">
          <div class="type-box">
            <div class="big">{{ result.mbti.type }}</div>
            <div class="nm">{{ result.mbti.name }}</div>
            <div class="ds">{{ result.mbti.desc }}</div>
          </div>
          <div style="font-size:13px;color:#5b6b80;margin:10px 0 6px;">各维度占比：</div>
          <div class="bars">
            <div class="pair" v-for="(pr, idx) in result.mbti.pairs" :key="idx">
              <div class="pair-head">
                <span style="color:#3b6ef0;font-weight:700">{{ pr.a }} {{ pr.pa }}%</span>
                <span style="color:#f3a712;font-weight:700">{{ pr.b }} {{ pr.pb }}%</span>
              </div>
              <div class="pair-track">
                <div class="bar-fill" :style="{ background: '#3b6ef0', width: pr.pa + '%' }"></div>
                <div class="bar-fill" :style="{ background: '#f3a712', width: pr.pb + '%' }"></div>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="part !== null && axes">
          <div class="radar-wrap">
            <RadarChart :axes="axes" :color="radarColorValue" />
            <div v-if="dominant" style="margin-top:10px;font-size:14px;color:#1f2a44;font-weight:700">
              主导维度：{{ dominant.label }} {{ dominant.rate }}%
            </div>
          </div>
        </template>

        <div
          v-if="part !== null"
          style="margin-top:18px;font-size:15px;font-weight:700;color:#3b6ef0;border-bottom:2px solid #10b3a3;padding-bottom:8px;margin-bottom:10px;"
        >
          答题记录（共 {{ size }} 题）
        </div>
        <div v-if="part !== null" class="ar-list">
          <div class="ar-row" v-for="(q, i) in partQuestions" :key="i">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import RadarChart from './RadarChart.vue'
import { surveyStore } from '@/stores/survey'
import type { RadarAxis } from '@/types/quiz'

const titles = [
  '第一部分 · MBTI 认知与决策模式',
  '第二部分 · DISC 行为与沟通风格',
  '第三部分 · PDP 能量特质与气场',
  '第四部分 · 九型 核心动机与注意力焦点',
  '第五部分 · 职业锚 职业价值与内在驱动力',
]
const radarColor = ['#3b6ef0', '#e4572e', '#3b6ef0', '#10b3a3', '#8b5cf6']
const keyMap: Record<number, 'disc' | 'pdp' | 'ennea' | 'career'> = { 1: 'disc', 2: 'pdp', 3: 'ennea', 4: 'career' }

const part = computed(() => surveyStore.state.viewRecordPart)
const result = computed(() => surveyStore.state.result)
const title = computed(() => (part.value !== null ? '📋 ' + titles[part.value] + '（' + surveyStore.displayName() + '）' : ''))
const axes = computed<RadarAxis[] | null>(() => {
  if (part.value === null || part.value === 0 || !result.value) return null
  return result.value[keyMap[part.value]]
})
const dominant = computed<RadarAxis | null>(() => {
  if (!axes.value || !axes.value.length) return null
  return axes.value.reduce((a, b) => (b.rate > a.rate ? b : a), axes.value[0])
})
const radarColorValue = computed(() => (part.value !== null ? radarColor[part.value] : '#3b6ef0'))
const size = computed(() => {
  if (part.value === null) return 0
  const qs = surveyStore.state.partsCache[part.value] || []
  return qs.length
})
const partQuestions = computed(() => {
  if (part.value === null) return []
  const qs = surveyStore.state.partsCache[part.value] || []
  return qs.map((q) => ({
    text: q.text,
    options: q.options,
    chosen: surveyStore.state.answers[q.index],
  }))
})

// 打开查看记录时，确保结果与各部题目已就绪（供雷达图与作答明细渲染）。
watch(part, async (p) => {
  if (p === null) return
  try {
    if (!surveyStore.state.result) await surveyStore.loadResult()
    await surveyStore.ensureAllParts()
  } catch {}
})

function close(): void { surveyStore.closeViewRecord() }
</script>
