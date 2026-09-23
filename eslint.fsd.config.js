// @ts-check

/**
 * Schichtgrenzen des FSD-Umbaus (tasks/plan-fsd-feature-module.md), vorerst nur als Warnung und ohne
 * Einfluss auf `bun run lint`. `bun run lint:fsd` zaehlt die Verstoesse gegen die Legacy-Schichten
 * (`core`, `infrastructure`, `components`, `features/<Modul>`); die Ratsche (`--max-warnings`) darf nur sinken.
 * In Phase P10 wandert der Regelsatz in `eslint.config.js` und wird zu `error`.
 */

import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import dbUx from '@db-ux/core-eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';

const FEATURES = ['Admin', 'ber', 'ea', 'ewt', 'ez'];

/**
 * @param {string} message - Hinweistext der Regel.
 * @param {string[]} group - Import-Muster (gitignore-Syntax).
 */
const restrict = (message, group) => ({ message, group });

const importsOf = name => [`@/${name}`, `@/${name}/**`];

export default defineConfig(
  {
    files: ['src/ts/**/*.ts', 'src/ts/**/*.tsx'],
    languageOptions: { parser: tseslint.parser },
    // Die Plugins sind nur registriert, nicht aktiv: ihre Direktiven wuerden sonst als 'unused' gezaehlt.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    // Nur registriert (ohne Regeln), damit vorhandene `eslint-disable`-Kommentare dieser Plugins aufloesen.
    plugins: { 'db-ux': dbUx, 'react-hooks': reactHooks },
  },
  {
    files: ['src/ts/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            restrict('core darf infrastructure nicht importieren (Ziel: shared).', importsOf('infrastructure')),
            restrict('core darf keine Features importieren (Ziel: Feature-Registry).', importsOf('features')),
          ],
        },
      ],
    },
  },
  {
    files: ['src/ts/infrastructure/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            restrict('infrastructure darf keine Features importieren (Ziel: Feature-Registry).', importsOf('features')),
          ],
        },
      ],
    },
  },
  {
    files: ['src/ts/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'warn',
        { patterns: [restrict('components darf keine Features importieren.', importsOf('features'))] },
      ],
    },
  },
  ...FEATURES.map(feature => ({
    files: [`src/ts/features/${feature}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: FEATURES.filter(other => other !== feature).map(other =>
            restrict(`${feature} darf ${other} nicht direkt importieren (Ziel: shared oder Feature-Registry).`, [
              `**/${other}`,
              `**/${other}/**`,
              // Admins eigene Unterordner `features/Admin/features/<key>` heissen wie die Module.
              ...(feature === 'Admin' ? ['!@/features/Admin/features/**'] : []),
            ]),
          ),
        },
      ],
    },
  })),
);
