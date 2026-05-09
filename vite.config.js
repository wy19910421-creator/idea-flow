import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// [https://vite.dev/config/](https://vite.dev/config/)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 拦截所有 /api/v3 的请求，悄悄转发给火山引擎，完美绕过本地跨域报错
      '/api/v3': {
        target: '[https://ark.cn-beijing.volces.com](https://ark.cn-beijing.volces.com)',
        changeOrigin: true,
      }
    }
  }
})