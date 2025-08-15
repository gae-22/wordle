// ESLint v9 Flat Config for wordle-web (NestJS + TypeScript)
// Docs: https://eslint.org/docs/latest/use/configure/

import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // Ignored files and folders
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'data/**', 'public/**', 'src/types/**'],
  },

  // Base JS recommended rules (won't apply to TS files unless matched by files pattern)
  js.configs.recommended,

  // TypeScript rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      globals: {
        ...globals.node,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'simple-import-sort': simpleImportSort,
      import: importPlugin,
      prettier,
    },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
      },
    },
    rules: {
      // Disable base rule that conflicts with TS type-aware analysis
      'no-undef': 'off',
      'no-unused-vars': 'off',

      // Prettier
      'prettier/prettier': 'error',

      // General
      curly: ['error', 'all'],
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Imports
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      'import/order': 'off',
      'import/no-default-export': 'off',

      // TypeScript
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', disallowTypeAnnotations: false },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
      '@typescript-eslint/prefer-nullish-coalescing': [
        'warn',
        { ignoreTernaryTests: true, ignoreConditionalTests: true },
      ],
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-confusing-void-expression': ['warn', { ignoreArrowShorthand: true }],
    },
  },

  // Turn off formatting-related rules that might conflict with Prettier
  eslintConfigPrettier,

  // Overrides
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.{js,ts}'],
    rules: { '@typescript-eslint/no-var-requires': 'off' },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    languageOptions: { globals: { jest: 'readonly' } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
];
