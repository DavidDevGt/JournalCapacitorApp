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
      },
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && (
            assetInfo.name.includes('icon-') || 
            assetInfo.name === 'favicon.ico' || 
            assetInfo.name === 'manifest.json'
          )) {
            return '[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    assetsInlineLimit: 0
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
  },
  assetsInclude: ['**/*.png', '**/*.ico', '**/*.json']
})