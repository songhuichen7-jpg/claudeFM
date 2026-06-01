import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiPort = process.env.SERVER_PORT ?? process.env.PORT ?? "8080"
const webPort = process.env.VITE_PORT ? Number(process.env.VITE_PORT) : undefined
const apiHttp = `http://127.0.0.1:${apiPort}`
const apiWs = `ws://127.0.0.1:${apiPort}`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: webPort,
    strictPort: Boolean(webPort),
    proxy: {
      '/api':   { target: apiHttp, changeOrigin: true },
      '/tts':   { target: apiHttp, changeOrigin: true },
      '/stream':{ target: apiWs,   ws: true, changeOrigin: true },
    },
  },
})
