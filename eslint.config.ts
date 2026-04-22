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
  vueTsConfigs.strictTypeChecked,
  vueTsConfigs.stylisticTypeChecked,
  perfectionist.configs['recommended-alphabetical'],
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url)),
      },
    },
    rules: {
      '@typescript-eslint/array-type': ['error', { default: 'generic' }],
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'as' }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
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
      '@typescript-eslint/no-extraneous-class': ['error', { allowStaticOnly: true }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowNullableBoolean: false,
          allowNullableNumber: false,
          allowNullableObject: false,
          allowNullableString: false,
          allowNumber: false,
          allowString: false,
        },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      eqeqeq: ['error', 'always'],
      'id-length': ['error', { exceptions: ['_'], min: 2 }],
      'lines-between-class-members': ['error', 'always'],
      'max-depth': ['error', 4],
      'max-params': ['error', 7],
      'no-console': 'warn',
      'no-debugger': 'warn',
      'no-param-reassign': 'error',
      'no-var': 'error',
      'perfectionist/sort-imports': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type', 'unknown'],
          internalPattern: ['^@/.+'],
          newlinesBetween: 0,
        },
      ],
      'prefer-const': 'error',
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/component-name-in-template-casing': ['error', 'PascalCase', { registeredComponentsOnly: false }],
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-refs': 'error',
      'vue/no-v-html': 'off',
    },
  },
  {
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/application/**', '@/infrastructure/**', '@/interface/**'],
              message: 'domain must not import from application, infrastructure, or interface',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/application/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/infrastructure/**', '@/interface/**'],
              message: 'application must not import from infrastructure or interface',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/infrastructure/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/interface/**'],
              message: 'infrastructure must not import from interface',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/interface/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/domain/**', '@/infrastructure/**'],
              message: 'interface must not import from domain or infrastructure; depend on application ports instead',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/domain/**', '@/application/**', '@/infrastructure/**', '@/interface/**'],
              message: 'shared must not import from any feature layer',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.js'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
    },
  },
  prettierConfig,
]);
