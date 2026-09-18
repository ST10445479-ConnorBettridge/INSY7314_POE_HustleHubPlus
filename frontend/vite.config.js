import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Development server proxies /api to the HTTPS backend so the browser only ever
// talks to Vite over HTTP (no self-signed certificate warnings in dev).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://localhost:3443',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
});