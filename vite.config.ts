import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // GitHub Pages serves the app under /euroskills-app/ — base must match the repo name.
  // For local dev this is ignored (Vite uses '/' by default when base is omitted via env).
  base: process.env.GITHUB_ACTIONS ? '/euroskills-app/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
