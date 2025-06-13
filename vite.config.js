import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  root: './www',
  base: './',
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './www/index.html'
      }
    }
  },
  server: {
    port: 8100,
    host: '0.0.0.0'
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@capacitor/core', '@capacitor/camera', '@capacitor/local-notifications']
  }
})
