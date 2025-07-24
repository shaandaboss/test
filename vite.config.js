import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: true // Show errors in browser overlay
    },
    watch: {
      // Enhanced file watching
      usePolling: true,
      interval: 100
    }
  },
  // Enable hot reload for all file types
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})