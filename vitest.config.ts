import path from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// TODO rethink
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
      reportsDirectory: path.resolve(__dirname, '.coverage'),
    },
    environment: 'happy-dom',
    exclude: ['node_modules', 'dist'],
    globals: false,
    include: ['**/*.test.ts'],
    passWithNoTests: true,
    restoreMocks: true,
    watch: false,
  },
});
