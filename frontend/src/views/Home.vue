<template>
  <div id="welcome">
    <div class="hero">
      <h1>职场基因检测</h1>
      <button class="start" @click="goLogin">进 入 测 试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
function goLogin(): void {
  router.push('/login')
}
</script>
