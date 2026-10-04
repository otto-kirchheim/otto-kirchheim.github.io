/**
 * Illustrationen bei aktiven DB-Assets (`DB_ASSETS`, Alias `@illustrationen` in `vite.base-config.ts`): bindet die SVGs aus
 * `@db-ux/db-theme-illustrative-icons` (DB-Designs-Lizenz). Gegenstueck ohne Assets: `illustrationen.frei.ts`.
 * Neue Namen hier im Glob-Muster und in `Illustration.tsx` (`IllustrationName`) eintragen.
 */
const dateien = import.meta.glob<string>(
  '../../../../../node_modules/@db-ux/db-theme-illustrative-icons/build/assets/{action,communication,feature}/{account,alarm_clock,calendar,cyber_security,error,pdf,user_manual}.svg',
  { query: '?url', import: 'default', eager: true },
);

/** Name (Dateiname ohne `.svg`) -> URL der Illustration. */
export const ILLUSTRATION_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(dateien).map(([pfad, url]) => [pfad.slice(pfad.lastIndexOf('/') + 1, -'.svg'.length), url]),
);
