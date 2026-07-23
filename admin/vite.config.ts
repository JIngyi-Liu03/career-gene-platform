import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// 管理后台独立应用：开发端口 8081，/api 反代到本地后端(:3000)。
export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 8081,
    proxy: {
      // 后台与本地的用户站前端共用腾讯云同一后端：/api 原样转发，
      // 由腾讯云 nginx 剥离 /api 前缀后打到后端 :3000（见 nginx/*.conf）。
      '/api': {
        target: 'http://101.34.219.83:8080',
        changeOrigin: true,
      },
    },
  },
})
