import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/', // 서브경로 배포 시 예: '/KakaoAIUX/'
  server: {
    port: 5176,
    host: true, // 같은 네트워크 외부 기기에서 접속 가능
  },
  preview: {
    port: 5176,
    host: true,
  },
})
