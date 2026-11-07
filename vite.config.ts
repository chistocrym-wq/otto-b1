import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Only B1 assets from public-b1 are served. This prevents copying the
// A1 public directory (audio, SEO, service worker, marketing pages) to B1.
export default defineConfig({
  plugins: [react()],
  publicDir: 'public-b1',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
