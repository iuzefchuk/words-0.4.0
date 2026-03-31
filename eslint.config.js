import prettierConfig from '@vue/eslint-config-prettier';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import perfectionist from 'eslint-plugin-perfectionist';
import pluginVue from 'eslint-plugin-vue';

export default defineConfigWithVueTs([
  {
    files: ['**/*.{js,ts,vue}'],
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  perfectionist.configs['recommended-alphabetical'],
  {
    rules: {
      '@typescript-eslint/array-type': ['error', { default: 'generic' }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          format: ['strictCamelCase', 'UPPER_CASE'],
          selector: 'variableLike',
        },
        {
          filter: { match: true, regex: '^_' },
          format: null,
          modifiers: ['unused'],
          selector: 'parameter',
        },
        {
          format: ['strictCamelCase', 'UPPER_CASE'],
          modifiers: ['const', 'global'],
          selector: 'variable',
        },
        {
          format: ['UPPER_CASE'],
          modifiers: ['static', 'readonly'],
          selector: 'classProperty',
        },
        {
          format: ['StrictPascalCase'],
          selector: 'typeLike',
        },
        {
          format: ['StrictPascalCase'],
          selector: 'enumMember',
        },
      ],
      'no-console': 'warn',
      'no-debugger': 'warn',
      'perfectionist/sort-imports': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type', 'unknown'],
          internalPattern: ['^@/.+', '^\\$/.+'],
          newlinesBetween: 0,
        },
      ],
      'prettier/prettier': [1, { arrowParens: 'avoid', semicolons: false, singleQuote: true }],
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/component-name-in-template-casing': ['error', 'PascalCase', { registeredComponentsOnly: false }],
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
    },
  },
  prettierConfig,
]);
