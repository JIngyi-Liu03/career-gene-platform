<template>
  <div
    style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 24px;margin-bottom:16px;box-shadow:0 2px 10px rgba(31,42,68,.04);"
  >
    <div class="radar-wrap">
      <h3 v-if="title">{{ title }}</h3>
      <p v-if="subtitle" class="sub">{{ subtitle }}</p>
      <RadarChart :axes="axes" :color="color" />
      <div v-if="dominant" style="margin-top:10px;font-size:14px;color:#1f2a44;font-weight:700">
        主导维度：{{ dominant.label }} {{ dominant.rate }}%
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RadarChart from './RadarChart.vue'
import type { RadarAxis } from '@/types/quiz'

const props = defineProps<{ title?: string; subtitle?: string; axes: RadarAxis[]; color: string }>()

const dominant = computed<RadarAxis | null>(() => {
  if (!props.axes || !props.axes.length) return null
  return props.axes.reduce((a, b) => (b.rate > a.rate ? b : a), props.axes[0])
})
</script>
