import path from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,
    emptyOutDir: true,
    outDir: path.resolve(__dirname, 'dist'),
    target: 'esnext',
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
  optimizeDeps: {
    include: ['vue', 'pinia'],
  },
  plugins: [vue()],
  publicDir: path.resolve(__dirname, 'public'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      $: path.resolve(__dirname, './tests'),
    },
  },
  root: path.resolve(__dirname, 'src/interface'),
  server: {
    port: Number(process.env.VITE_PORT) || 5173,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
  },
});
