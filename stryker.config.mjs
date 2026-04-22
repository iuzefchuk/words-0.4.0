export default {
  coverageAnalysis: 'perTest',
  htmlReporter: {
    fileName: '.stryker-report/index.html',
  },
  mutate: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.d.ts', '!src/**/index.ts'],
  reporters: ['html', 'clear-text', 'progress'],
  tempDirName: '.stryker-tmp',
  testRunner: 'vitest',
};
