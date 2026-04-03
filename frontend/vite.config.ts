// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

// Nếu bạn dùng CommonJS style, file này vẫn chạy trên Vite 8+

export default defineConfig({
  plugins: [
    react(),         // Plugin React
    tsconfigPaths(), // Cho phép đọc alias từ tsconfig
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // alias @ => src
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // backend
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})