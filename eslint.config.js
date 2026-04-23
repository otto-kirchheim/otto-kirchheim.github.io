// @ts-check

import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig(
  // Basis
  eslint.configs.recommended,
  tseslint.configs.recommended,

  // Typed Linting fuer Regeln mit Type-Informationen (z.B. no-deprecated)
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Prettier (deaktiviert ESLint-Regeln, die mit Prettier kollidieren)
  prettierConfig,

  // Konfiguration
  {
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',

      // Allgemein
      'no-console': 'off',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-deprecated': 'error',
    },
  },

  // Dateien ignorieren
  {
    ignores: ['dist/**', 'src/dev-dist/**', 'node_modules/**', '*.js'],
  },

  // Test-Dateien: any in Mocks erlauben
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
);
