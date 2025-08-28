import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // This proxy is useful for local development. It tells the Vite dev server
  // to forward any requests to /api to the Vercel dev server (which runs on port 3000).
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    }
  }
})
