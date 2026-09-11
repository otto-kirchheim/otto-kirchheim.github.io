// Handgepflegter Spiegel von `src/scss/_breakpoints.scss`. Es gibt keinen Build-Schritt, der
// SCSS-Variablen nach TypeScript exportiert -- aendert sich dort etwas, muss diese Tabelle mit.
// `xs`-`xl` stammen aus `@db-ux/core-foundations`, `xxl` ist die Projekt-Erweiterung darueber
// (DB endet bei `xl`); die Begruendung steht in der SCSS-Datei.
// Kein `as const`: die Werte muessen `number` bleiben, sonst passt `Object.values(...)
// .includes(breite)` in `CustomTable` nicht mehr. Die Schluessel sind auch so literal.
export const BREAKPOINTS = {
  xs: 320,
  sm: 768,
  md: 1024,
  lg: 1440,
  xl: 1920,
  xxl: 2560,
};

export type BreakpointName = keyof typeof BREAKPOINTS;
