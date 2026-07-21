<template>
  <div :id="cid" class="radar-host"></div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { drawRadar } from '@/utils/radar'
import type { RadarAxis } from '@/types/quiz'

const props = defineProps<{ axes: RadarAxis[]; color: string }>()
const cid = 'radar-' + Math.random().toString(36).slice(2, 9)

function render(): void {
  drawRadar(cid, props.axes, props.color)
}
onMounted(render)
watch(() => props.axes, render, { deep: true })
</script>
