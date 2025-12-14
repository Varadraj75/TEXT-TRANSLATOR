import { defineConfig } from 'vite'

export default defineConfig({
  root: './',
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/api-proxy': {
        target: 'https://deep-translator-api.azurewebsites.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, ''),
      },
    },
  }
})
