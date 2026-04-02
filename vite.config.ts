import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2200,
    emptyOutDir: true,
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'pinia'],
        },
      },
    },
  },
  cacheDir: fileURLToPath(new URL('./node_modules/.vite', import.meta.url)),
  define: {
    APP_VERSION: JSON.stringify(version),
  },
  plugins: [vue()],
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      $: fileURLToPath(new URL('./tests', import.meta.url)),
    },
  },
  root: 'src/gui',
  server: {
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
    port: Number(process.env.LOCALHOST_PORT) || 5173,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['../../tests/**/*.test.ts'],
    restoreMocks: true,
  },
});
