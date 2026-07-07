import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        // Live backend; switch to http://localhost:5000 when testing backend changes locally.
        target: 'https://interactive-story-writing.onrender.com',
        changeOrigin: true,
      }
    }
  }
})
