// Handgepflegter Spiegel von `@db-ux/core-foundations/build/styles/_screen-sizes.scss`.
// Es gibt keinen Build-Schritt, der SCSS-Variablen nach TypeScript exportiert -- aendert DB
// die Werte, muss diese Tabelle mitgezogen werden (und `customtable.scss` bezieht sie direkt).
// Kein `as const`: die Werte muessen `number` bleiben, sonst passt `Object.values(...)
// .includes(breite)` in `CustomTable` nicht mehr. Die Schluessel sind auch so literal.
export const BREAKPOINTS = {
  xs: 320,
  sm: 768,
  md: 1024,
  lg: 1440,
  xl: 1920,
};

export type BreakpointName = keyof typeof BREAKPOINTS;
