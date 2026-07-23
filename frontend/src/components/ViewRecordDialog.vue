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
        <div
          v-if="part !== null"
          style="margin-top:8px;font-size:15px;font-weight:700;color:#3b6ef0;border-bottom:2px solid #10b3a3;padding-bottom:8px;margin-bottom:10px;"
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
import { surveyStore } from '@/stores/survey'

const titles = ['第一部分', '第二部分', '第三部分', '第四部分', '第五部分']

const part = computed(() => surveyStore.state.viewRecordPart)
const title = computed(() =>
  part.value !== null
    ? '📋 ' + titles[part.value] + ' · 答题记录（' + surveyStore.displayName() + '）'
    : '',
)
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

// 打开查看记录时，确保各部题目已就绪（供作答明细渲染）。
watch(part, async (p) => {
  if (p === null) return
  try {
    await surveyStore.ensureAllParts()
  } catch {}
})

function close(): void { surveyStore.closeViewRecord() }
</script>
