<template>
  <div class="line-chart">
    <svg viewBox="0 0 800 260" preserveAspectRatio="none" class="chart-svg">
      <line
        v-for="g in gridYs"
        :key="'g' + g.y"
        :x1="padL"
        :y1="g.y"
        :x2="800 - padR"
        :y2="g.y"
        class="grid"
      />
      <text
        v-for="g in gridYs"
        :key="'t' + g.y"
        :x="padL - 8"
        :y="g.y + 4"
        class="axis-y"
      >{{ g.label }}</text>

      <polyline :points="points" class="line" />
      <circle
        v-for="(p, i) in pts"
        :key="'p' + i"
        :cx="p.x"
        :cy="p.y"
        r="3"
        class="dot"
      >
        <title>{{ data[i]?.day }}：{{ data[i]?.count }} 次访问</title>
      </circle>

      <text
        v-for="(l, i) in xLabels"
        :key="'x' + i"
        :x="l.x"
        :y="254"
        class="axis-x"
      >{{ l.text }}</text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { VisitPoint } from '@/api/admin'

const props = defineProps<{ data: VisitPoint[] }>()

const padL = 40
const padR = 16
const padTop = 16
const padBottom = 28
const W = 800
const H = 260
const plotW = W - padL - padR
const plotH = H - padTop - padBottom

const maxCount = computed(() => Math.max(1, ...props.data.map((d) => d.count)))

const yOf = (c: number) => padTop + plotH * (1 - c / maxCount.value)
const xOf = (i: number) => {
  const n = props.data.length
  if (n <= 1) return padL
  return padL + (plotW * i) / (n - 1)
}

const pts = computed(() =>
  props.data.map((d, i) => ({ x: xOf(i), y: yOf(d.count) })),
)

const points = computed(() => pts.value.map((p) => `${p.x},${p.y}`).join(' '))

const gridYs = computed(() => {
  const steps = 4
  const arr: { y: number; label: string }[] = []
  for (let s = 0; s <= steps; s++) {
    const val = Math.round((maxCount.value * s) / steps)
    arr.push({ y: yOf(val), label: String(val) })
  }
  return arr
})

const xLabels = computed(() => {
  const n = props.data.length
  if (n === 0) return []
  const want = Math.min(7, n)
  const idxs = new Set<number>()
  for (let k = 0; k < want; k++) idxs.add(Math.round((k * (n - 1)) / (want - 1)))
  return [...idxs].map((i) => ({
    x: Math.min(800 - padR, Math.max(padL, xOf(i) - 18)),
    text: props.data[i].day.slice(5), // MM-DD
  }))
})
</script>

<style scoped>
.line-chart {
  width: 100%;
}
.chart-svg {
  width: 100%;
  height: 260px;
  display: block;
}
.grid {
  stroke: #eef1f6;
  stroke-width: 1;
}
.axis-y {
  fill: #9aa3b2;
  font-size: 11px;
  text-anchor: end;
}
.axis-x {
  fill: #9aa3b2;
  font-size: 11px;
  text-anchor: middle;
}
.line {
  fill: none;
  stroke: #4f7cff;
  stroke-width: 2.5;
  vector-effect: non-scaling-stroke;
}
.dot {
  fill: #4f7cff;
}
</style>
