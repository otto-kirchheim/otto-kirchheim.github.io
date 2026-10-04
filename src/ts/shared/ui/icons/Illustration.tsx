import { ILLUSTRATION_URLS } from '@illustrationen';

/**
 * Mehrfarbige Illustrationen aus `@db-ux/db-theme-illustrative-icons` (64x64-SVG, DB-Designs-Lizenz) fuer grosse,
 * dekorative Stellen: Startseiten-Karten, Kennzahl-Kacheln. Nicht fuer Knoepfe, Kopfzeile oder
 * Tabellenzellen -- dort bleiben die einfarbigen Icons (`data-icon`).
 *
 * Schalter `DB_ASSETS` (`vite.base-config.ts`): der Alias `@illustrationen` zeigt nur bei an auf `illustrationen.db.ts`,
 * das die SVG-Dateien bindet; aus (`illustrationen.frei.ts`) bleibt nichts davon im Bundle und es erscheint das einfarbige
 * Ersatz-Icon `ersatz`, ohne Ersatz gar nichts. Neue Namen hier in `IllustrationName` und im Glob-Muster von `illustrationen.db.ts`.
 */
export type IllustrationName =
  'account' | 'alarm_clock' | 'calendar' | 'cyber_security' | 'error' | 'pdf' | 'user_manual';

/**
 * Illustration mit Ersatz-Icon fuer die freie Variante.
 *
 * @param props - `name` der Illustration, `ersatz` (DB-Icon-Name fuer `data-icon`, optional) und `className` fuer das Ersatz-Icon (Farbe/Groesse wie bisher).
 */
export default function Illustration({
  name,
  ersatz,
  className = '',
}: {
  name: IllustrationName;
  ersatz?: string;
  className?: string;
}) {
  const url = ILLUSTRATION_URLS[name];
  if (url) return <img src={url} alt="" aria-hidden="true" className="illustration" />;
  if (!ersatz) return null;
  return <span className={`db-icon ${className}`.trim()} data-icon={ersatz} aria-hidden="true" />;
}
