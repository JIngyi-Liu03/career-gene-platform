import { createRouter, createWebHistory } from 'vue-router'
import { hasTokens } from '@/api/http'

import Home from '@/views/Home.vue'
import LoginView from '@/views/LoginView.vue'
import Select from '@/views/Select.vue'
import Notice from '@/views/Notice.vue'
import Chapter from '@/views/Chapter.vue'
import Quiz from '@/views/Quiz.vue'
import Result from '@/views/Result.vue'

// 用户流程（无参数路由）：
// / → /login（独立登录页 + 路由守卫）→ /select → /notice(分支) → /chapter → /quiz → /result
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home, meta: { public: true } },
    { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
    { path: '/select', component: Select },
    { path: '/notice', component: Notice },
    { path: '/chapter', component: Chapter },
    { path: '/quiz', component: Quiz },
    { path: '/result', component: Result },
  ],
})

// 路由守卫：未登录访问受保护页 → 跳转 /login?redirect=原目标；已登录访问 /login → 直接进站点
router.beforeEach((to) => {
  const authed = hasTokens()
  if (to.name === 'login') {
    if (authed) {
      const r =
        typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/')
          ? to.query.redirect
          : '/select'
      return r
    }
    return true
  }
  if (to.meta.public) return true
  if (!authed) return { name: 'login', query: { redirect: to.fullPath } }
  return true
})

export default router
