import path from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      $: path.resolve(__dirname, './tests'),
    },
  },
  test: {
    clearMocks: true,
    coverage: {
      exclude: ['**/*.d.ts', '**/index.ts'],
      include: ['src'],
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './tests/coverage',
    },
    environment: 'jsdom',
    exclude: ['node_modules', 'dist'],
    globals: true,
    include: ['**/*.{test,spec}.ts'],
    restoreMocks: true,
    setupFiles: ['./tests/setup.ts'],
    watch: false,
  },
});
