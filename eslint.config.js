import prettierConfig from '@vue/eslint-config-prettier';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginImport from 'eslint-plugin-import';
import pluginVue from 'eslint-plugin-vue';

export default defineConfigWithVueTs([
  {
    files: ['**/*.{js,ts,vue}'],
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    plugins: {
      import: pluginImport,
    },
    rules: {
      'sort-imports': ['error', { ignoreDeclarationSort: true, ignoreMemberSort: false }],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            { pattern: '@/**', group: 'internal' },
            { pattern: '$/**', group: 'internal' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'never',
        },
      ],
      'no-console': 'warn',
      'no-debugger': 'warn',
      'prettier/prettier': [1, { semicolons: false, singleQuote: true, arrowParens: 'avoid' }],
      'vue/component-name-in-template-casing': ['error', 'PascalCase', { registeredComponentsOnly: false }],
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      '@typescript-eslint/array-type': ['error', { default: 'generic' }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: {
            memberTypes: [
              // public
              'public-static-readonly-field',
              'public-static-field',
              'public-readonly-field',
              'public-instance-field',
              // protected
              'protected-static-readonly-field',
              'protected-static-field',
              'protected-readonly-field',
              'protected-instance-field',
              // private
              'private-static-readonly-field',
              'private-static-field',
              'private-readonly-field',
              'private-instance-field',
              // lifecycle
              'constructor',
              'public-static-method',
              ['public-get', 'public-set'],
              'public-instance-method',
              'protected-static-method',
              ['protected-get', 'protected-set'],
              'protected-instance-method',
              'private-static-method',
              ['private-get', 'private-set'],
              'private-instance-method',
            ],
          },
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variableLike',
          format: ['strictCamelCase', 'UPPER_CASE'],
        },
        {
          selector: 'parameter',
          modifiers: ['unused'],
          format: null,
          filter: { regex: '^_', match: true },
        },
        {
          selector: 'variable',
          modifiers: ['const', 'global'],
          format: ['strictCamelCase', 'UPPER_CASE'],
        },
        {
          selector: 'classProperty',
          modifiers: ['static', 'readonly'],
          format: ['UPPER_CASE'],
        },
        {
          selector: 'typeLike',
          format: ['StrictPascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['StrictPascalCase'],
        },
      ],
    },
  },
  prettierConfig,
]);
