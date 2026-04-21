export default {
  testRunner: 'vitest',
  mutate: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.d.ts', '!src/**/index.ts'],
  coverageAnalysis: 'perTest',
  reporters: ['html', 'clear-text', 'progress'],
  tempDirName: '.stryker-tmp',
  htmlReporter: {
    fileName: '.stryker-report/index.html',
  },
};
