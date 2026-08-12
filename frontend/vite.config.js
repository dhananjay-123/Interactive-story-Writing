import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        // Route splitting alone still leaves the big third-party libraries
        // duplicated across whichever chunks import them. Pinning them to their
        // own files means the editor's TipTap payload is fetched once and then
        // cached, and — more to the point — never reaches a reader who only ever
        // browses stories.
        // Rolldown (Vite 8) takes manualChunks as a function rather than the
        // object map the Rollup builds used.
        // Rolldown's own chunking API rather than Rollup's manualChunks.
        //
        // manualChunks is not consulted for the CommonJS interop wrappers the
        // bundler synthesises (`require_react`, `require_jsx_runtime`), so those
        // were being parked in whichever chunk first reached them — TipTap's.
        // That gave the entry a static import of the editor chunk and shipped
        // all 447 kB of it to every reader on the home page. `groups` carries
        // explicit priorities, so React is claimed before TipTap can take it.
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 100 },
            { name: 'router', test: /node_modules[\\/]react-router/, priority: 90 },
            { name: 'editor', test: /node_modules[\\/](@tiptap|prosemirror)/, priority: 50 },
            { name: 'realtime', test: /node_modules[\\/](socket\.io|engine\.io)/, priority: 50 },
            { name: 'imaging', test: /node_modules[\\/]browser-image-compression/, priority: 50 },
            { name: 'vendor', test: /node_modules/, priority: 1 },
          ],
        },
      },
    },
  },
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
  },
  // `vite preview` serves the production build (service worker included) and
  // needs the same API proxy as dev.
  preview: {
    proxy: {
      '/api': {
        target: 'https://interactive-story-writing.onrender.com',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'https://interactive-story-writing.onrender.com',
        changeOrigin: true,
        ws: true,
      },
    }
  }
})
