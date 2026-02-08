import { defineConfig } from 'vite'

export default defineConfig({
  base: '/jointjs/',
  publicDir: 'public',
  server: {
    port: 3000,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})