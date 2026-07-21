<template>
  <div class="progress">
    <div class="progress-track"><div class="progress-fill" :style="{ width: percent + '%' }"></div></div>
    <div class="progress-text">{{ text }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ percent: number; text: string }>()
</script>
