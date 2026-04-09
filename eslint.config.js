import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import prettierConfig from '@vue/eslint-config-prettier';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import perfectionist from 'eslint-plugin-perfectionist';
import pluginVue from 'eslint-plugin-vue';

const gitignorePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.gitignore');

export default defineConfigWithVueTs([
  includeIgnoreFile(gitignorePath),
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
      'lines-between-class-members': ['error', 'always'],
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
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/component-name-in-template-casing': ['error', 'PascalCase', { registeredComponentsOnly: false }],
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-refs': 'warn',
      'vue/no-v-html': 'off',
    },
  },
  prettierConfig,
]);
