<template>
  <div id="toast" :class="{ show: ui.state.toast.show }">{{ ui.state.toast.msg }}</div>
</template>

<script setup lang="ts">
import { uiStore as ui } from '@/stores/ui'
</script>
