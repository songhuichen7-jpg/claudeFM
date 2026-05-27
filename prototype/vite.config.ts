import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Repo name (case-sensitive) used as the Pages base path in production.
const REPO = 'claudeFM'

export default defineConfig(({ command }) => ({
  root: __dirname,
  base: command === 'build' ? `/${REPO}/` : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
  },
}))
