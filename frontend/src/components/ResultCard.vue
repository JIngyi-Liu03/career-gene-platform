<template>
  <div class="card">
    <h3 v-if="title">{{ title }}</h3>
    <div v-if="dominant" class="type-box">
      <div class="big">{{ dominant.label }}</div>
    </div>
    <div class="bar-list">
      <div v-for="(ax, i) in axes" :key="i" class="bar-row">
        <span class="bar-label">{{ ax.label }}</span>
        <span class="bar-rate">{{ ax.rate }}%</span>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: ax.rate + '%', background: color }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mapEnneaLetter, stripTypeLetter } from '@/utils/labels'
import type { RadarAxis } from '@/types/quiz'

const props = defineProps<{ title?: string; axes: RadarAxis[]; color: string }>()

// 九型人格：主导维度展示为「序号·类型」（如 1号·完美型），其余原样
const isEnnea = computed(() => (props.title || '').startsWith('九型'))
const dominant = computed(() => {
  const xs = props.axes || []
  if (!xs.length) return null
  const top = xs.reduce((a, b) => (b.rate > a.rate ? b : a), xs[0])
  const label = isEnnea.value ? mapEnneaLetter(top.label) : top.label
  return { ...top, label: stripTypeLetter(label) }
})
</script>

<style scoped>
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 18px;
  margin-bottom: 8px;
  /* 覆盖 style.css 里遗留的 .card 旧规则（min-height:62vh / display:flex），
     否则每个板块会被强制撑到 62vh 高，造成板块之间出现大段空白 */
  min-height: 0;
  display: block;
  box-shadow: 0 2px 10px rgba(31, 42, 68, 0.04);
}
.card h3 { margin: 0 0 8px; font-size: 16px; color: #1f2a44; font-weight: 700; }
.bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0;
  font-size: 13px;
}
.bar-label {
  min-width: 96px;
  flex: none;
  font-weight: 700;
  color: #1f2a44;
  white-space: nowrap;
}
.bar-track {
  flex: 1;
  height: 12px;
  background: #eef1f6;
  border-radius: 6px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
}
.bar-rate {
  width: 48px;
  flex: none;
  text-align: left;
  font-weight: 700;
  color: #5b6b80;
}
</style>
