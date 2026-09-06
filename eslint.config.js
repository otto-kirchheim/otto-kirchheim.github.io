// @ts-check

import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import dbUx from '@db-ux/core-eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

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

  // React: Rules of Hooks fehlten unter Preact komplett; JSX-Runtime ist automatisch,
  // deshalb ohne die `react-in-jsx-scope`-Altlasten aus `react/recommended`.
  {
    files: ['**/*.tsx'],
    ...react.configs.flat.recommended,
    ...react.configs.flat['jsx-runtime'],
    // Version fest: `detect` laesst eslint-plugin-react 7.37 unter ESLint 10 abstuerzen
    // (`context.getFilename` gibt es dort nicht mehr).
    settings: { react: { version: '19.2' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      // Props werden ueber TypeScript typisiert, nicht ueber propTypes.
      'react/prop-types': 'off',
      // Deutsche Anfuehrungszeichen im JSX-Text sind gewollt.
      'react/no-unescaped-entities': 'off',
      // Waehrend der Migration hart, damit Preact-Attribute (class=, for=) auffallen.
      'react/no-unknown-property': 'error',
    },
  },
  // DB-UX-eigene Regeln (Label-Pflicht, Button-Typ, Tooltip-Regeln ...) fuer die
  // Komponenten-Adapter aus Phase C.
  {
    files: ['**/*.tsx'],
    plugins: { 'db-ux': dbUx },
    rules: dbUx.configs.recommended.rules,
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Die Compiler-Regeln aus Plugin v7 treffen Muster, die unter Preact korrekt waren
      // (State im Effect setzen, Ref waehrend des Renders schreiben). Aufraeumen passiert
      // in einer spaeteren Phase -- waehrend des Framework-Wechsels nur als Hinweis.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
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
