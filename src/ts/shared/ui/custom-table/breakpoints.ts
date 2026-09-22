// Handgepflegter Spiegel von `src/scss/_breakpoints.scss` (kein Build-Schritt exportiert SCSS-Variablen
// nach TypeScript) -- aendert sich dort etwas, muss diese Tabelle mit. `xs`-`xl` stammen aus
// `@db-ux/core-foundations`, `xxl` ist die Projekt-Erweiterung darueber; Begruendung in der SCSS-Datei.
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
