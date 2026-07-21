<template>
  <div class="card">
    <div class="section-hint" v-if="hint">{{ hint }}</div>
    <div class="qhead">
      <div class="qt">{{ questionText }}</div>
    </div>
    <div class="opts">
      <div
        v-for="(opt, oi) in question.options"
        :key="oi"
        class="opt"
        :class="{ sel: chosen === oi }"
        @click="emit('choose', oi)"
      >
        <span class="tag">{{ String.fromCharCode(65 + oi) }}</span>
        <span class="opt-text">{{ opt }}</span>
      </div>
    </div>
    <div class="bar-actions">
      <button class="nav prev" :disabled="!canPrev" @click="emit('prev')">上一题</button>
      <button class="nav prev" @click="emit('back')">返回选择页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { QuestionDto } from '@/types/quiz'

const props = defineProps<{
  question: QuestionDto
  chosen: number | null
  canPrev: boolean
  hint: string
}>()

const emit = defineEmits<{
  (e: 'choose', oi: number): void
  (e: 'prev'): void
  (e: 'back'): void
}>()

// 去掉题号前缀（后端已清洗，这里再兜底一次）。
const questionText = computed(
  () =>
    props.question.text
      .replace(/^第[一二三四五六七八九十百零]+部分[:：]?\s*/, '')
      .replace(/^\d+[、.．\s]*/, '')
      .replace(/^\d+(?=[一-龥])/, '') || '请选择更合你心意的一项：'
)
</script>
