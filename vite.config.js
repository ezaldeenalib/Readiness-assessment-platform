import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    // Allow access via server IP/domain (not only localhost)
    host: true,
    port: 5173,
    strictPort: true,
    // If you access Vite from another machine and HMR websocket fails,
    // set VITE_HMR_HOST=142.132.189.60 (or your domain) when running.
    hmr: process.env.VITE_HMR_HOST
      ? { host: process.env.VITE_HMR_HOST, clientPort: 5173 }
      : undefined,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    // V-15: source maps disabled in production to avoid exposing source code
    sourcemap: process.env.NODE_ENV !== 'production',
  }
})
