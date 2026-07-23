import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  // 静态部署友好：使用相对 base，便于直接以文件或可反代方式托管
  base: './',
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/quiz': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
      '/report': 'http://localhost:3000',
      '/analytics': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
