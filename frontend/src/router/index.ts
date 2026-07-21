import { createRouter, createWebHistory } from 'vue-router'

import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'
import Recover from '@/views/Recover.vue'
import Select from '@/views/Select.vue'
import Notice from '@/views/Notice.vue'
import Chapter from '@/views/Chapter.vue'
import Quiz from '@/views/Quiz.vue'
import Result from '@/views/Result.vue'

// 用户流程（无参数路由）：
// / → /login → /register|/recover → /select → /notice(分支) → /chapter → /quiz → /result
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/login', component: Login },
    { path: '/register', component: Register },
    { path: '/recover', component: Recover },
    { path: '/select', component: Select },
    { path: '/notice', component: Notice },
    { path: '/chapter', component: Chapter },
    { path: '/quiz', component: Quiz },
    { path: '/result', component: Result },
  ],
})

export default router
