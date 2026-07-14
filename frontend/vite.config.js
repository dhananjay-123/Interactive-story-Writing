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
      // Live backend; switch to http://localhost:5000 when testing backend changes locally.
      '/api': {
        target: 'https://interactive-story-writing.onrender.com',
        changeOrigin: true,
      },
      // WebSocket path for live collaboration — proxied to the same backend.
      '/socket.io': {
        target: 'https://interactive-story-writing.onrender.com',
        changeOrigin: true,
        ws: true,
      },
    }
  }
})
