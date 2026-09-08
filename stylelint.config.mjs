/**
 * Stylelint fuer die eigenen Styles (`src/scss/*`, `customtable.css`, `CustomSnackbar.css`).
 *
 * Zweck seit Phase H der DB-UX-Migration: Bootstrap ist raus, Abstaende, Groessen, Rahmen und
 * Radien kommen jetzt aus den DB-Tokens. Das `@db-ux/core-stylelint`-Plugin haelt das fest --
 * ein hart geschriebenes `margin: 12px` faellt hier auf, bevor es im Design auffaellt.
 *
 * Laeuft ueber `bun run lint:css` und als Teil von `bun run release:check`.
 *
 * **Ratsche statt Vollsperre:** die fuenf `db-ux/*`-Regeln melden als `warning`, nicht als
 * `error`. Der Bestand hat dort noch Altlast (Canvas-Geometrie, die feste 11.5rem-Labelspalte
 * der Berechnung, breakpoint-genaue Innenabstaende der `CustomTable`) -- die auf Tokens zu
 * ziehen aendert das Design und gehoert in Phase I. Damit die Zahl nicht wieder waechst, laeuft
 * `lint:css` mit `--max-warnings 93` (Stand 2026-09-08): jede neue Hartcodierung bricht den
 * Lauf, jede beseitigte darf die Grenze in `package.json` senken.
 *
 * Ein Teil der 93 ist nicht aufloesbar -- das Plugin sieht nur den geschriebenen Wert, nicht
 * das, was dahinter steht: `gap: $wert` (SCSS-Variable, die bereits ein Token haelt),
 * `gap: var(--raster-abstand)`, `inline-size: var(--db-icon-font-size)`, `border-radius: 50%`
 * fuer den runden Punkt, `1px` fuer Trennlinien. Diese Meldungen bleiben stehen; wer die
 * Grenze senkt, prueft die Liste, statt sie pauschal wegzudruecken.
 */

/** @type {import("stylelint").Config} */
export default {
  extends: ['stylelint-config-standard'],
  plugins: ['@db-ux/core-stylelint', 'stylelint-use-logical', '@double-great/stylelint-a11y'],
  overrides: [
    {
      // SCSS braucht Parser und Regelsatz fuer SCSS, sonst stolpert Stylelint schon ueber `//`
      // und meldet jedes `@use`/`@each`/`@mixin` als unbekannte At-Rule.
      files: ['**/*.scss'],
      extends: ['stylelint-config-standard-scss'],
    },
    {
      // `db-ux.css` enthaelt nur die beiden Paket-Importe in ihre Cascade Layer.
      files: ['src/scss/db-ux.css'],
      rules: {
        // Vite loest Bare-Specifier (`@db-ux/...`) nur in der String-Form auf, nicht in `url()`.
        'import-notation': null,
      },
    },
  ],
  rules: {
    // ── DB-Tokens statt fester Werte (siehe Ratsche oben) ──
    'db-ux/use-spacings': [true, { severity: 'warning' }], // margin, padding, gap
    'db-ux/use-sizing': [true, { severity: 'warning' }], // height, width, block-size, inline-size
    'db-ux/use-border-width': [true, { severity: 'warning' }],
    'db-ux/use-border-radius': [true, { severity: 'warning' }],
    'db-ux/use-border-color': [true, { severity: 'warning' }],

    // ── Logische Eigenschaften ──
    // DB UX schreibt durchgaengig logisch (`inline-size`, `margin-block-end`).
    // `top`/`right`/`bottom`/`left`/`inset` sind ausgenommen: der Autofix fasst mehrere davon
    // zu `inset: logical … ` zusammen, und diese Kurzform unterstuetzt kein Browser -- die
    // Snackbar-Positionierung war damit still kaputt.
    'csstools/use-logical': ['always', { except: ['top', 'right', 'bottom', 'left', 'inset'] }],

    // ── Namenskonventionen ──
    // Klassen und Ids stehen zugleich als Selektoren in TS-Dateien und in `index.html`
    // (`customtableIcon`, `#Berechnung`, `#collapseFour`, `#btnResendVerificationEmail`).
    // Umbenennen waere ein eigener Schnitt quer durch `CustomTable`, `tabController` und die
    // Feature-Module. Die Muster lassen den Bestand zu, verlangen fuer Neues aber kebab-case
    // bzw. camelCase -- kein `snake_case`, kein `SCREAMING_CASE`.
    'selector-class-pattern': [
      '^[a-zA-Z][a-zA-Z0-9]*(?:(?:-{1,2}|__)[a-zA-Z0-9]+)*$',
      { message: 'Klassennamen in kebab-case schreiben; BEM (`__element`, `--modifikator`) ist erlaubt' },
    ],
    'selector-id-pattern': ['^[a-zA-Z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$', { message: 'Ids in kebab-case schreiben' }],

    // ── Bewusst abgeschaltet ──
    // Die Reihenfolge der Regeln folgt der fachlichen Gliederung (Tabelle, Dialog, Navigation),
    // nicht der Spezifitaet. Umsortieren wuerde die Dateien unlesbar machen.
    'no-descending-specificity': null,
    // `@media (max-width: 1199.98px)` bleibt: die Breakpoints sind mit den JS-seitigen
    // Umbruchpunkten der `CustomTable` abgestimmt und dort ebenfalls als max-Werte notiert.
    'media-feature-range-notation': null,
  },
};
