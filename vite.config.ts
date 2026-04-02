import path from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,
    emptyOutDir: true,
    outDir: 'dist',
    target: 'esnext',
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  optimizeDeps: {
    include: ['vue', 'pinia'],
  },
  plugins: [vue()],
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      $: path.resolve(__dirname, './tests'),
    },
  },
  root: 'src/gui',
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
