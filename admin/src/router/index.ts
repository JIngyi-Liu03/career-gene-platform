import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/views/Login.vue'
import UserPanel from '@/views/UserPanel.vue'
import { hasToken } from '@/api/http'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login, meta: { public: true } },
    { path: '/', redirect: '/users' },
    { path: '/users', component: UserPanel, meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/users' },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !hasToken()) return '/login'
  if (to.path === '/login' && hasToken()) return '/'
  return true
})

export default router
