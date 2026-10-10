import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 3000,
    allowedHosts: ['pv-272a620360a9-ac977c5a-8aba-4465-a80f-ccc3bc4413aa.style.dev'],
    proxy: {
      // Browser talks same-origin; the dev server proxies API calls in-VM.
      '/api': { target: 'http://localhost:3001', changeOrigin: false },
    },
  },
});
