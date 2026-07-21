<template>
  <div
    style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 24px;margin-bottom:16px;box-shadow:0 2px 10px rgba(31,42,68,.04);"
  >
    <div class="radar-wrap">
      <h3>职业锚 · 职业价值与内在驱动力</h3>
      <RadarChart :axes="axes" :color="color" />
      <div style="margin-top:14px">
        <div v-for="ax in axes" :key="ax.label" style="display:flex;align-items:center;gap:10px;margin:6px 0;font-size:13px;">
          <span style="width:54px;font-weight:700;color:#1f2a44">{{ ax.label }}</span>
          <div style="flex:1;height:12px;background:#eef1f6;border-radius:6px;overflow:hidden">
            <div :style="{ width: ax.rate + '%', height: '100%', background: color }"></div>
          </div>
          <span style="width:42px;text-align:right;font-weight:700;color:#5b6b80">{{ ax.rate }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import RadarChart from './RadarChart.vue'
import type { RadarAxis } from '@/types/quiz'

defineProps<{ axes: RadarAxis[]; color: string }>()
</script>
