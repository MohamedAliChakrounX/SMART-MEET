import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 1. Specific AI-only sub-paths
      '^/api/v1/meetings/(upload|transcribe)': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/v1', '/api'),
        timeout: 600_000,
      },
      // 2. Translation requests (all formats) -> Flask
      '^/api/v1/meetings/.*/translate': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/v1', '/api'),
        timeout: 60_000,
      },
      // 3. Dynamic 9-digit meeting IDs (Flask JobStore)
      '^/api/v1/meetings/\\d{9}(/.*)?': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/v1', '/api'),
        timeout: 30_000,
      },
      // 4. Dynamic 9-digit summary IDs (Flask JobStore)
      '^/api/v1/summaries/\\d{9}': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/v1', '/api'),
        timeout: 30_000,
      },
      // 4. All other /api/v1 calls → Symfony (PostgreSQL)
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        timeout: 30_000,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
})
