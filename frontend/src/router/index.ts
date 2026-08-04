import { createRouter, createWebHistory } from 'vue-router'
import { hasTokens } from '@/api/http'
import { authModal } from '@/stores/authModal'

import Home from '@/views/Home.vue'
import Select from '@/views/Select.vue'
import Notice from '@/views/Notice.vue'
import Chapter from '@/views/Chapter.vue'
import Quiz from '@/views/Quiz.vue'
import Result from '@/views/Result.vue'

// 用户流程（无参数路由）：
// / →（登录弹窗）→ /select → /notice(分支) → /chapter → /quiz → /result
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home, meta: { public: true } },
    { path: '/login', redirect: '/' },
    { path: '/select', component: Select },
    { path: '/notice', component: Notice },
    { path: '/chapter', component: Chapter },
    { path: '/quiz', component: Quiz },
    { path: '/result', component: Result },
  ],
})

// 路由守卫：未登录访问受保护页 → 弹出登录弹窗（记录 redirect），并停在首页背后；
// 已登录则正常放行。登录成功后由弹窗跳转到 redirect || /select。
router.beforeEach((to) => {
  if (to.meta.public) return true
  if (!hasTokens()) {
    authModal.openAuth('login', to.fullPath)
    return to.path === '/' ? true : { path: '/' }
  }
  return true
})

export default router
