<template>
  <div class="admin-app">
    <header class="topbar" v-if="hasToken()">
      <div class="brand">职业基因检测 · 管理后台</div>
      <nav class="tabs">
        <router-link to="/">题库面板</router-link>
        <router-link to="/users">用户面板</router-link>
      </nav>
      <button class="logout" @click="logout">退出登录</button>
    </header>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { hasToken, clearToken } from '@/api/http'

const router = useRouter()
function logout() {
  clearToken()
  router.push('/login')
}
</script>
