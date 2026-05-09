import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 拦截 /doubao-api，骗过浏览器跨域，悄悄转发给真实的火山引擎地址
      '/doubao-api': {
        target: 'https://ark.cn-beijing.volces.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/doubao-api/, '/api/v3')
      }
    }
  }
})