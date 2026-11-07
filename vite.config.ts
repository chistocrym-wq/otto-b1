import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { preview20JourneyPlugin } from './scripts/preview20-journey-plugin.mjs';

export default defineConfig({
  plugins: [preview20JourneyPlugin(), react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  optimizeDeps: { exclude: ['lucide-react'] },
});
