<template>
  <div class="card">
    <h3>职业锚 · 职业价值与内在驱动力</h3>
    <div class="bar-list">
      <div v-for="(ax, i) in axes" :key="i" class="bar-row">
        <span class="bar-label">{{ ax.label }}</span>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: ax.rate + '%', background: color }"></div>
        </div>
        <span class="bar-rate">{{ ax.rate }}%</span>
      </div>
    </div>
    <div v-if="dominant" class="dominant">主导锚点：{{ dominant.label }} {{ dominant.rate }}%</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RadarAxis } from '@/types/quiz'

const props = defineProps<{ axes: RadarAxis[]; color: string }>()

const dominant = computed(() => {
  const xs = props.axes || []
  if (!xs.length) return null
  return xs.reduce((a, b) => (b.rate > a.rate ? b : a), xs[0])
})
</script>

<style scoped>
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 18px;
  margin-bottom: 10px;
  box-shadow: 0 2px 10px rgba(31, 42, 68, 0.04);
}
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
  width: 42px;
  flex: none;
  text-align: right;
  font-weight: 700;
  color: #5b6b80;
}
.dominant {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #1f2a44;
}
</style>
